// Tests of version.mjs. Usage: npm test, in scripts/
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bump, goModuleErrors, goModulePath, labelErrors, lastReleaseTag, nextRelease } from './version.mjs';

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
  assert.deepEqual(nextRelease('v1.1.0', prs), { version: '1.2.0', internal: false });
  assert.equal(nextRelease('v1.1.0', [...prs, { number: 4, labels: ['version:major'] }]).version, '2.0.0');
});

test('one merged pull request gives one release', () => {
  assert.deepEqual(nextRelease('v1.2.0', [{ number: 9, labels: ['version:patch'] }]), {
    version: '1.2.1',
    internal: false,
  });
});

test('the release is internal when each pull request that needs a release is internal', () => {
  const internal = { number: 1, labels: ['version:minor', 'version:internal'] };
  const none = { number: 2, labels: ['version:none'] };
  assert.equal(nextRelease('v1.1.0', [internal, none]).internal, true);
  assert.equal(nextRelease('v1.1.0', [internal, { number: 3, labels: ['version:patch'] }]).internal, false);
});

test('a pull request without a valid label fails, and the error names it', () => {
  assert.throws(
    () => nextRelease('v1.1.0', [{ number: 1, labels: ['version:patch'] }, { number: 7, labels: [] }]),
    /#7: needs exactly one/,
  );
});

test('only version:none gives no release', () => {
  assert.deepEqual(nextRelease('v1.1.0', [{ number: 1, labels: ['version:none'] }]), { version: null });
  assert.deepEqual(nextRelease('v1.1.0', []), { version: null });
});

test('the Go module path ends in /v<major> from v2 on', () => {
  assert.equal(goModulePath('1.6.0'), 'github.com/grafana/viz-contract');
  assert.equal(goModulePath('v2.0.0'), 'github.com/grafana/viz-contract/v2');
  assert.equal(goModulePath('3.1.0'), 'github.com/grafana/viz-contract/v3');
  assert.throws(() => goModulePath('2.0'));
});

test('go.mod must have the module path of the version', () => {
  const v1 = 'module github.com/grafana/viz-contract\n\ngo 1.24\n';
  const v2 = 'module github.com/grafana/viz-contract/v2\n\ngo 1.24\n';
  assert.deepEqual(goModuleErrors(v1, '1.6.0'), []);
  assert.deepEqual(goModuleErrors(v2, '2.0.0'), []);
  assert.match(goModuleErrors(v1, '2.0.0')[0], /needs the module path github.com\/grafana\/viz-contract\/v2/);
  assert.equal(goModuleErrors(v2, '3.0.0').length, 1);
  assert.equal(goModuleErrors(v2, '1.7.0').length, 1);
  assert.match(goModuleErrors('go 1.24\n', '1.6.0')[0], /go.mod has none/);
});

test('the last release tag is the largest version, not the last line', () => {
  const lsRemote = [
    'a\trefs/tags/v1.10.0',
    'b\trefs/tags/v1.9.3',
    'c\trefs/tags/v2.0.0-rc.1',
    'd\trefs/tags/v1.2.0',
  ].join('\n');
  assert.equal(lastReleaseTag(lsRemote), 'v1.10.0');
  assert.throws(() => lastReleaseTag(''));
});
