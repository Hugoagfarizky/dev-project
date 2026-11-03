'use strict';

// Ordered SP-05 case registry. `proof` cases are the three repaired CDP proof
// cases required before the full T-01..T-06 run is attempted.

const cases = [
  require('./t01-world-translate'),
  require('./t02-world-rotate'),
  require('./t03-local-scale-unrotated'),
  require('./t04-local-scale-rotated'),
  require('./t05-mode-switch'),
  require('./t06-transform-integrity')
];

const byId = new Map(cases.map((def) => [def.id.toUpperCase(), def]));

function select(selector) {
  if (!selector || selector === 'all') return cases.slice();
  if (selector === 'proof') return cases.filter((def) => def.proof);
  const ids = selector.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean);
  const selected = [];
  for (const id of ids) {
    const digits = id.replace(/^T-?/i, '');
    const normalized = 'T-' + digits.padStart(2, '0');
    const def = byId.get(normalized);
    if (!def) throw new Error('Unknown case selector: ' + id);
    selected.push(def);
  }
  return selected;
}

module.exports = {
  cases,
  byId,
  select
};
