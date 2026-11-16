import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePythonActions, sanitizePythonLogs, applyPythonActions } from '../../src/python/actions.ts';
import { parsePythonError } from '../../src/python/errors.ts';
import { validatePythonProjectData, findPythonScript } from '../../src/python/validation.ts';
import { PYTHON_SOURCE_MAX_CHARS } from '../../src/python/limits.ts';

test('sanitizePythonActions keeps valid actions and drops junk', () => {
  const input = [
    { type: 'applyForce', entityId: 'e1', vector: [1, 2, 3] },
    { type: 'applyImpulse', entityId: 'e2', vector: { x: 4, y: 5, z: 6 } },
    { type: 'clearForces', entityId: 'e3' },
    { type: 'applyForce', entityId: 'e4', vector: [1, 2] },
    { type: 'nope', entityId: 'e5' },
    'garbage'
  ];
  const result = sanitizePythonActions(input);
  assert.equal(result.length, 3);
  assert.deepEqual(result[0], { type: 'applyForce', entityId: 'e1', vector: { x: 1, y: 2, z: 3 } });
});

test('sanitizePythonActions rejects non-finite vectors', () => {
  const result = sanitizePythonActions([{ type: 'applyForce', entityId: 'e1', vector: [1, Infinity, 3] }]);
  assert.equal(result.length, 0);
});

test('sanitizePythonLogs caps lines and chars', () => {
  const input = Array.from({ length: 5 }, (_, i) => ({ level: 'info', message: 'x'.repeat(10) }));
  const { logs, truncated } = sanitizePythonLogs(input, 3, 5);
  assert.equal(logs.length, 3);
  assert.equal(truncated, true);
  assert.equal(logs[0].message.length, 5);
});

test('applyPythonActions throws on unknown entity', () => {
  assert.throws(() => applyPythonActions({}, [{ type: 'applyForce', entityId: 'missing', vector: { x: 1, y: 0, z: 0 } }]));
});

test('parsePythonError recovers line number', () => {
  const report = parsePythonError('ZeroDivisionError', 'Traceback (most recent call last):\n  File "<exec>", line 3, in <module>\nZeroDivisionError: division by zero');
  assert.equal(report.line, 3);
  assert.match(report.message, /ZeroDivisionError/);
});

test('validatePythonProjectData strips invalid scripts', () => {
  const result = validatePythonProjectData({
    scripts: [
      { id: 'a', name: 'A', source: 'print(1)' },
      { id: 'a', name: 'Dup', source: 'print(2)' },
      { id: 'b', name: '', source: 'print(3)' },
      { id: 'c', name: 'C', source: 'x'.repeat(PYTHON_SOURCE_MAX_CHARS + 1) }
    ]
  });
  assert.equal(result.value?.scripts.length, 1);
  assert.equal(result.warnings.length, 3);
});

test('validatePythonProjectData accepts null/undefined', () => {
  assert.equal(validatePythonProjectData(null).value, null);
  assert.equal(validatePythonProjectData(undefined).value, null);
});

test('findPythonScript locates by id', () => {
  const data = { scripts: [{ id: 's1', name: 'S', source: '' }] };
  assert.equal(findPythonScript(data, 's1')?.name, 'S');
  assert.equal(findPythonScript(data, 'missing'), null);
});
