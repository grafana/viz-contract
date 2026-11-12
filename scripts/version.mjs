// The version labels of pull requests. CONTRIBUTING.md gives the rules.
//
// node scripts/version.mjs labels '<JSON array of label names>'
//   Exit code 1 when the labels of one pull request are not valid.
// node scripts/version.mjs next <owner/repo> <last tag> <commit>
//   Prints the next release as JSON, from the labels of the pull requests merged after <last tag> up to <commit>:
//   {"version":"1.2.0","internal":false}, or {"version":null} when each pull request has version:none.
//   Exit code 1 when a pull request has no valid labels. Reads the token from GH_TOKEN.
// node scripts/version.mjs gomod <version>
//   Exit code 1 when the module path in go.mod is not the path of <version>.
// node scripts/version.mjs gomod-labels '<JSON array of label names>'
//   With version:major, exit code 1 when the module path in go.mod is not the path of the next major version.
//   The last tag comes from origin. With no version:major, it checks nothing.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GO_MODULE = 'github.com/grafana/viz-contract';

// The kinds that make a release, largest first. expectedVersion takes the first one that a pull request has.
export const RELEASE_KINDS = ['version:major', 'version:minor', 'version:patch'];
export const KINDS = [...RELEASE_KINDS, 'version:none'];
export const INTERNAL = 'version:internal';

// The problems with the labels of one pull request. An empty list means the labels are valid.
export function labelErrors(names) {
  const errors = [];
  const kinds = names.filter((n) => KINDS.includes(n));
  if (kinds.length !== 1) {
    errors.push(`needs exactly one of ${KINDS.join(', ')}, has ${kinds.length ? kinds.join(', ') : 'none'}`);
  }
  if (names.includes(INTERNAL) && !names.includes('version:minor')) {
    errors.push(`${INTERNAL} needs version:minor`);
  }
  return errors;
}

export function bump(version, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`not a version: ${version}`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (kind === 'version:major') return `${major + 1}.0.0`;
  if (kind === 'version:minor') return `${major}.${minor + 1}.0`;
  if (kind === 'version:patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`not a release kind: ${kind}`);
}

// Go resolves a tag from v2.0.0 on only if the module path ends in /v<major>.
export function goModulePath(version) {
  const major = Number(/^v?(\d+)\.\d+\.\d+$/.exec(version)?.[1]);
  if (Number.isNaN(major)) throw new Error(`not a version: ${version}`);
  return major >= 2 ? `${GO_MODULE}/v${major}` : GO_MODULE;
}

// The problems with the module path of go.mod for a version. An empty list means the path is right.
export function goModuleErrors(goMod, version) {
  const have = /^module\s+(\S+)/m.exec(goMod)?.[1];
  const want = goModulePath(version);
  return have === want ? [] : [`v${version.replace(/^v/, '')} needs the module path ${want} in go.mod, but go.mod has ${have ?? 'none'}`];
}

// The largest release tag, for example v1.5.1, from the output of git ls-remote --tags.
export function lastReleaseTag(lsRemote) {
  const versions = [...lsRemote.matchAll(/refs\/tags\/v(\d+)\.(\d+)\.(\d+)$/gm)].map((m) => m.slice(1).map(Number));
  if (!versions.length) throw new Error('no release tag');
  versions.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return `v${versions.at(-1).join('.')}`;
}

function checkGoModule(version) {
  const goMod = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'go.mod'), 'utf8');
  const errors = goModuleErrors(goMod, version);
  for (const e of errors) console.log(`FAIL [go-module] ${e}`);
  if (errors.length) process.exit(1);
  console.log(`PASS [go-module] go.mod has the module path ${goModulePath(version)}`);
}

// prs: [{ number, labels: [name] }]. Returns { version, internal }, or { version: null } when no pull request
// needs a release. The release is internal when each pull request that needs a release has version:internal.
// Throws an Error that names each pull request with labels that are not valid.
export function nextRelease(last, prs) {
  const problems = prs
    .map((pr) => ({ pr, errors: labelErrors(pr.labels) }))
    .filter((p) => p.errors.length)
    .map((p) => `#${p.pr.number}: ${p.errors.join('; ')}`);
  if (problems.length) throw new Error(`pull requests with labels that are not valid:\n${problems.join('\n')}`);
  const kind = RELEASE_KINDS.find((k) => prs.some((pr) => pr.labels.includes(k)));
  if (!kind) return { version: null };
  const releasing = prs.filter((pr) => !pr.labels.includes('version:none'));
  return {
    version: bump(last.replace(/^v/, ''), kind),
    internal: releasing.every((pr) => pr.labels.includes(INTERNAL)),
  };
}

// The merged pull requests of the first-parent commits after `last` up to `commit`.
// Throws when a commit has no merged pull request, for example a direct push, because it has no labels.
async function mergedPullRequests(repo, last, commit) {
  const shas = execFileSync('git', ['rev-list', '--first-parent', `${last}..${commit}`], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  const prs = new Map();
  const unmerged = [];
  for (const sha of shas) {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/pulls`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${process.env.GH_TOKEN}`,
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!res.ok) throw new Error(`GET pulls of ${sha}: ${res.status} ${await res.text()}`);
    const merged = (await res.json()).filter((pr) => pr.merged_at && pr.base.ref === 'main');
    if (!merged.length) unmerged.push(sha);
    for (const pr of merged) prs.set(pr.number, { number: pr.number, labels: pr.labels.map((l) => l.name) });
  }
  if (unmerged.length) {
    throw new Error(`commits after ${last} without a merged pull request, so without labels:\n${unmerged.join('\n')}`);
  }
  return [...prs.values()];
}

async function main([mode, ...args]) {
  if (mode === 'labels') {
    const errors = labelErrors(JSON.parse(args[0]));
    for (const e of errors) console.log(`FAIL [version-label] ${e}`);
    if (errors.length) process.exit(1);
    console.log('PASS [version-label] the labels are valid');
  } else if (mode === 'next') {
    const [repo, last, commit] = args;
    console.log(JSON.stringify(nextRelease(last, await mergedPullRequests(repo, last, commit))));
  } else if (mode === 'gomod') {
    checkGoModule(args[0]);
  } else if (mode === 'gomod-labels') {
    if (!JSON.parse(args[0]).includes('version:major')) {
      console.log('PASS [go-module] no version:major, so the module path does not change');
      return;
    }
    const tags = execFileSync('git', ['ls-remote', '--tags', '--refs', 'origin', 'v*'], { encoding: 'utf8' });
    checkGoModule(bump(lastReleaseTag(tags).slice(1), 'version:major'));
  } else {
    console.error(
      'usage: node scripts/version.mjs labels <json> | next <owner/repo> <last tag> <commit> | gomod <version> | gomod-labels <json>',
    );
    process.exit(2);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
