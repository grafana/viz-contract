// The version labels of pull requests. CONTRIBUTING.md gives the rules.
//
// node scripts/version.mjs labels '<JSON array of label names>'
//   Exit code 1 when the labels of one pull request are not valid.
// node scripts/version.mjs expected <owner/repo> <last tag> <commit>
//   Prints the version that the pull requests merged after <last tag> up to <commit> give.
//   Exit code 1 when a pull request has no valid labels, or when no pull request needs a release.
//   Reads the token from GH_TOKEN.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

// prs: [{ number, labels: [name] }]. Throws an Error that names each problem.
export function expectedVersion(last, prs) {
  const problems = prs
    .map((pr) => ({ pr, errors: labelErrors(pr.labels) }))
    .filter((p) => p.errors.length)
    .map((p) => `#${p.pr.number}: ${p.errors.join('; ')}`);
  if (problems.length) throw new Error(`pull requests with labels that are not valid:\n${problems.join('\n')}`);
  const kind = RELEASE_KINDS.find((k) => prs.some((pr) => pr.labels.includes(k)));
  if (!kind) throw new Error(`each pull request after ${last} has version:none, so no release is needed`);
  return bump(last.replace(/^v/, ''), kind);
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
  } else if (mode === 'expected') {
    const [repo, last, commit] = args;
    console.log(expectedVersion(last, await mergedPullRequests(repo, last, commit)));
  } else {
    console.error('usage: node scripts/version.mjs labels <json> | expected <owner/repo> <last tag> <commit>');
    process.exit(2);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
