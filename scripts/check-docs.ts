// Keeps docs/ in step with the code. Every doc starts with frontmatter whose
// `covers` lists the files (or folders) it describes; this checks that:
//
//   1. every `covers` path still exists (no stale docs);
//   2. every page, component, lib module, data file and Worker file is
//      covered by some doc (no undocumented code);
//   3. every `env.X` the Worker reads is in docs/operations.md;
//   4. with --base <ref>, every changed file that a doc covers has at least
//      one of its docs changed too, unless the PR body (PR_BODY) has a line
//      starting "Docs: not needed".
//
//   bun scripts/check-docs.ts                     checks 1-3
//   bun scripts/check-docs.ts --base origin/main  checks 1-4 against a branch
//   bun scripts/check-docs.ts --which <file>...   prints the docs covering each file

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const DOCS_DIR = 'docs'
const ESCAPE = /^Docs: not needed/im

// Code that must be covered by a doc. Tests and the shadcn primitives in
// src/components/ui are left out: they describe nothing a reader looks up.
const MUST_COVER: { dir: string; ext: RegExp }[] = [
  { dir: 'src/pages', ext: /\.tsx$/ },
  { dir: 'src/components', ext: /\.tsx$/ },
  { dir: 'src/lib', ext: /(?<!\.test)\.ts$/ },
  { dir: 'src/data', ext: /\.ts$/ },
  { dir: 'worker', ext: /\.ts$/ },
]

type Doc = { path: string; covers: string[] }

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

export function parseCovers(text: string): string[] {
  const fm = text.match(/^---\n([\s\S]*?)\n---/)
  if (!fm) return []
  const block = fm[1].match(/^covers:\n((?:[ \t]+- .*\n?)*)/m)
  return block ? block[1].split('\n').map((l) => l.replace(/^\s*- /, '').trim()).filter(Boolean) : []
}

const loadDocs = (): Doc[] =>
  walk(DOCS_DIR).filter((p) => p.endsWith('.md')).map((path) => ({ path, covers: parseCovers(readFileSync(path, 'utf8')) }))

// A doc covers a file when it lists the file itself or a folder it sits in.
const covering = (docs: Doc[], file: string) =>
  docs.filter((d) => d.covers.some((c) => file === c || file.startsWith(c.replace(/\/$/, '') + '/')))

function staticChecks(docs: Doc[]): string[] {
  const errors: string[] = []
  for (const d of docs)
    for (const c of d.covers) if (!existsSync(c)) errors.push(`${d.path} covers ${c}, which no longer exists. Update or remove it.`)

  for (const { dir, ext } of MUST_COVER)
    for (const file of readdirSync(dir).filter((f) => ext.test(f)).map((f) => `${dir}/${f}`))
      if (!covering(docs, file).length) errors.push(`${file} isn't covered by any doc. Add it to the \`covers\` of the doc that describes it, or write one in docs/features/.`)

  const ops = readFileSync(join(DOCS_DIR, 'operations.md'), 'utf8')
  const names = new Set(walk('worker').flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\benv\.([A-Z][A-Z0-9_]*)/g)].map((m) => m[1])))
  for (const n of names) if (!ops.includes('`' + n + '`')) errors.push(`The Worker reads env.${n}, but docs/operations.md doesn't list it under Settings and secrets.`)
  return errors
}

function diffCheck(docs: Doc[], base: string, prBody: string): string[] {
  if (ESCAPE.test(prBody)) return []
  const changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const changedSet = new Set(changed)
  const errors: string[] = []
  for (const file of changed) {
    const docsFor = covering(docs, file)
    if (docsFor.length && !docsFor.some((d) => changedSet.has(d.path)))
      errors.push(`${file} changed, but none of its docs did: ${docsFor.map((d) => d.path).join(', ')}. Update one, or add a line "Docs: not needed — <reason>" to the PR description.`)
  }
  return errors
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const docs = loadDocs()
  if (args[0] === '--which') {
    for (const file of args.slice(1)) console.log(`${file}: ${covering(docs, file).map((d) => d.path).join(', ') || '(no doc)'}`)
    process.exit(0)
  }
  const b = args.indexOf('--base')
  const errors = [...staticChecks(docs), ...(b >= 0 ? diffCheck(docs, args[b + 1], process.env.PR_BODY ?? '') : [])]
  for (const e of errors) console.error(`error: ${e}`)
  if (errors.length) process.exit(1)
  console.log(`docs ok: ${docs.length} docs${b >= 0 ? `, checked against ${args[b + 1]}` : ''}`)
}
