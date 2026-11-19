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
import ast
import builtins
import inspect
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
    "extensions": [],
    "extension_values": {},
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


class Extension:
    """Read-only view of one project-local extension."""

    __slots__ = ("_id", "_name", "_version", "_enabled", "_permissions", "_components")

    def __init__(self, data):
        self._id = str(data.get("id", ""))
        self._name = str(data.get("name", ""))
        self._version = str(data.get("version", ""))
        self._enabled = bool(data.get("enabled", False))
        self._permissions = tuple(str(item) for item in data.get("permissions", []))
        self._components = tuple(str(item) for item in data.get("components", []))

    @property
    def id(self):
        return self._id

    @property
    def name(self):
        return self._name

    @property
    def version(self):
        return self._version

    @property
    def enabled(self):
        return self._enabled

    @property
    def permissions(self):
        return self._permissions

    @property
    def components(self):
        return self._components

    def __repr__(self):
        return "Extension(" + repr(self._name) + ")"


class Simulation:
    @property
    def time(self):
        return _state["time"]

    @property
    def dt(self):
        return _state["dt"]

    @property
    def extensions(self):
        return tuple(_state["extensions"])

    def extension_value(self, component_id):
        """Return the transient value of an extension component, or None."""
        return _state["extension_values"].get(str(component_id))


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


_stderr_stream = _Stream("warn")


async def __sf_run(source):
    # Capture stderr only while the user script runs. Pyodide formats an escaping
    # Python exception by writing it to the C-level stderr buffer, so a replaced
    # sys.stderr would silently turn the reported error message into an empty
    # string. Restoring it in the finally block keeps the traceback intact.
    previous = sys.stderr
    sys.stderr = _stderr_stream
    try:
        flags = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
        code = compile(source, "<exec>", "exec", flags=flags, dont_inherit=True)
        result = eval(code, globals())
        if inspect.isawaitable(result):
            await result
    finally:
        sys.stderr = previous


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
    module.Extension = Extension
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
    _state["extensions"] = []
    for item in data.get("extensions", []) or []:
        _state["extensions"].append(Extension(item))
    _state["extension_values"] = {}
    for key, value in (data.get("extensionValues", {}) or {}).items():
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        _state["extension_values"][str(key)] = float(value)
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
`;
