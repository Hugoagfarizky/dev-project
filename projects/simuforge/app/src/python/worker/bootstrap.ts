/**
 * Python bootstrap installed once per worker.
 *
 * It builds the `simuforge` module the published API exposes, captures stdout
 * and stderr as console lines, records declarative physics actions instead of
 * mutating host state, and installs an import guard for the JS bridge and
 * network-capable standard-library modules.
 *
 * The guard is defence in depth, not a security boundary: Pyodide runs inside a
 * Web Worker, and the worker is not a sandbox. The main thread re-validates every
 * message the worker returns.
 */
export const PYTHON_BOOTSTRAP = String.raw`
import builtins
import json
import sys
import types

_MAX_LOGS = 200
_MAX_ACTIONS = 256
_MAX_LOG_CHARS = 2000

_BLOCKED_ROOTS = frozenset({
    "js",
    "pyodide",
    "pyodide_js",
    "micropip",
    "urllib",
    "http",
    "socket",
    "ssl",
    "ftplib",
    "telnetlib",
    "smtplib",
    "poplib",
    "imaplib",
    "xmlrpc",
    "webbrowser",
    "ctypes",
    "subprocess",
    "multiprocessing",
})

_state = {
    "entities": [],
    "by_name": {},
    "time": 0.0,
    "dt": 0.0,
    "actions": [],
    "logs": [],
    "truncated": False,
}


def _append_log(level, message):
    if len(_state["logs"]) >= _MAX_LOGS:
        _state["truncated"] = True
        return
    text = str(message)
    if len(text) > _MAX_LOG_CHARS:
        text = text[:_MAX_LOG_CHARS]
        _state["truncated"] = True
    _state["logs"].append({"level": level, "message": text})


def _as_vec(value, label):
    if isinstance(value, (list, tuple)) and len(value) == 3:
        result = []
        for item in value:
            if isinstance(item, bool) or not isinstance(item, (int, float)):
                raise TypeError(label + " expects three numbers")
            number = float(item)
            if number != number or number == float("inf") or number == float("-inf"):
                raise ValueError(label + " expects finite numbers")
            result.append(number)
        return result
    raise TypeError(label + " expects a 3-number vector such as (0.0, 4.0, 0.0)")


def _push_action(action):
    if len(_state["actions"]) >= _MAX_ACTIONS:
        raise RuntimeError(
            "action limit exceeded: a script may request at most "
            + str(_MAX_ACTIONS)
            + " physics actions per run"
        )
    _state["actions"].append(action)


class Entity:
    """Read-only snapshot of one world entity."""

    __slots__ = ("_id", "_name", "_position", "_velocity")

    def __init__(self, data):
        self._id = str(data["id"])
        self._name = str(data["name"])
        self._position = tuple(data["position"])
        self._velocity = tuple(data["velocity"])

    @property
    def id(self):
        return self._id

    @property
    def name(self):
        return self._name

    @property
    def position(self):
        return self._position

    @property
    def velocity(self):
        return self._velocity

    def apply_force(self, vector):
        _push_action({
            "type": "applyForce",
            "entityId": self._id,
            "vector": _as_vec(vector, "apply_force"),
        })

    def apply_impulse(self, vector):
        _push_action({
            "type": "applyImpulse",
            "entityId": self._id,
            "vector": _as_vec(vector, "apply_impulse"),
        })

    def clear_forces(self):
        _push_action({"type": "clearForces", "entityId": self._id})

    def __repr__(self):
        return "Entity(" + repr(self._name) + ")"


class World:
    def get(self, name):
        if not isinstance(name, str):
            raise TypeError("world.get expects an entity name string")
        entity = _state["by_name"].get(name)
        if entity is None:
            raise LookupError("no entity named " + repr(name))
        return entity

    def log(self, message):
        _append_log("info", message)


class Simulation:
    @property
    def time(self):
        return _state["time"]

    @property
    def dt(self):
        return _state["dt"]


class _Stream:
    def __init__(self, level):
        self._level = level

    def write(self, text):
        value = str(text)
        if value:
            for line in value.splitlines():
                if line:
                    _append_log(self._level, line)
        return len(value)

    def flush(self):
        return None

    def isatty(self):
        return False


def _install_import_guard():
    real_import = builtins.__import__

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        root = str(name).split(".")[0]
        if root in _BLOCKED_ROOTS:
            raise ImportError(
                "module " + repr(name) + " is not available in the SimuForge Python runtime"
            )
        return real_import(name, globals, locals, fromlist, level)

    builtins.__import__ = guarded_import


def _install_module():
    module = types.ModuleType("simuforge")
    module.world = World()
    module.simulation = Simulation()
    module.Entity = Entity
    sys.modules["simuforge"] = module


def __sf_prepare(payload):
    data = json.loads(payload)
    _state["entities"] = []
    _state["by_name"] = {}
    _state["actions"] = []
    _state["logs"] = []
    _state["truncated"] = False
    _state["time"] = float(data.get("time", 0.0))
    _state["dt"] = float(data.get("dt", 0.0))
    for item in data.get("entities", []):
        entity = Entity(item)
        _state["entities"].append(entity)
        _state["by_name"][entity.name] = entity


def __sf_collect():
    return json.dumps({
        "actions": _state["actions"],
        "logs": _state["logs"],
        "truncated": _state["truncated"],
    })


_install_import_guard()
_install_module()
sys.stdout = _Stream("info")
sys.stderr = _Stream("warn")
`;
