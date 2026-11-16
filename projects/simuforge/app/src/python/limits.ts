/**
 * Phase 07 Python limits.
 *
 * Every value here is derived from POC 4 evidence
 * (`projects/simuforge/reports/poc-04`), not invented in advance:
 *
 * - A simple `sum(range(200000))` took ~10 ms, so 1 000 ms is a generous
 *   per-invocation budget that still keeps the execution queue responsive.
 * - An interrupt stopped a `while True` loop in ~33 ms of real work after a
 *   300 ms settle, so a 250 ms grace before falling back to termination is
 *   conservative.
 * - A 200 000-character result was capped at 65 536 characters, which is the
 *   tested output ceiling.
 * - A terminated worker took ~2.1 s to restart, so restarts are budgeted to
 *   avoid thrash.
 *
 * These are deliberately module constants, not user-editable settings: v1 has
 * no per-project limit configuration.
 */

/** Maximum Python source size per script, in characters (64 KiB). */
export const PYTHON_SOURCE_MAX_CHARS = 64 * 1024;

/** Maximum characters returned across one invocation's output (64 KiB). */
export const PYTHON_OUTPUT_MAX_CHARS = 64 * 1024;

/** Maximum console lines captured from one invocation. */
export const PYTHON_CONSOLE_MAX_LINES = 200;

/** Maximum declarative physics actions one invocation may request. */
export const PYTHON_ACTION_MAX_COUNT = 256;

/** Per-invocation execution budget before the runtime interrupts. */
export const PYTHON_EXECUTION_TIMEOUT_MS = 1000;

/** Time allowed for an interrupt to take effect before the worker is terminated. */
export const PYTHON_INTERRUPT_GRACE_MS = 250;

/** Hard-cancel restarts allowed inside one window. */
export const PYTHON_RESTART_MAX = 3;

/** Restart budget window. */
export const PYTHON_RESTART_WINDOW_MS = 60_000;

/** Maximum length of a Python script name. */
export const PYTHON_SCRIPT_NAME_MAX_CHARS = 128;

/** Fixed simulation timestep exposed to Python as `simulation.dt`. */
export const PYTHON_FIXED_DT_SECONDS = 1 / 60;
