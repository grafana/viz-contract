// Tests of version.mjs. Usage: node --test scripts/
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bump, expectedVersion, labelErrors } from './version.mjs';

test('one kind label is valid', () => {
  for (const k of ['version:major', 'version:minor', 'version:patch', 'version:none']) {
    assert.deepEqual(labelErrors([k, 'area:process']), []);
  }
  assert.deepEqual(labelErrors(['version:minor', 'version:internal']), []);
});

test('no kind label, or two, is not valid', () => {
  assert.equal(labelErrors([]).length, 1);
  assert.equal(labelErrors(['area:contract']).length, 1);
  assert.equal(labelErrors(['version:minor', 'version:patch']).length, 1);
});

test('version:internal needs version:minor', () => {
  assert.equal(labelErrors(['version:patch', 'version:internal']).length, 1);
  assert.equal(labelErrors(['version:internal']).length, 2);
});

test('bump', () => {
  assert.equal(bump('1.1.0', 'version:major'), '2.0.0');
  assert.equal(bump('1.1.3', 'version:minor'), '1.2.0');
  assert.equal(bump('1.1.3', 'version:patch'), '1.1.4');
  assert.throws(() => bump('1.1', 'version:patch'));
  assert.throws(() => bump('1.1.0', 'version:none'));
});

test('the largest label gives the version', () => {
  const prs = [
    { number: 1, labels: ['version:patch'] },
    { number: 2, labels: ['version:minor', 'version:internal'] },
    { number: 3, labels: ['version:none'] },
  ];
  assert.equal(expectedVersion('v1.1.0', prs), '1.2.0');
  assert.equal(expectedVersion('v1.1.0', [...prs, { number: 4, labels: ['version:major'] }]), '2.0.0');
});

test('a pull request without a valid label fails, and the error names it', () => {
  assert.throws(
    () => expectedVersion('v1.1.0', [{ number: 1, labels: ['version:patch'] }, { number: 7, labels: [] }]),
    /#7: needs exactly one/,
  );
});

test('only version:none fails', () => {
  assert.throws(() => expectedVersion('v1.1.0', [{ number: 1, labels: ['version:none'] }]), /no release is needed/);
  assert.throws(() => expectedVersion('v1.1.0', []), /no release is needed/);
});
