// Fails when unit tests cover less than 95% of the lines or functions in
// src/, reading the lcov report `bun test` writes (see bunfig.toml).
// Run with `bun run test`, which tests first.
import { readFileSync } from 'node:fs'

const MIN = 95
const lcov = readFileSync(process.argv[2] ?? 'coverage/lcov.info', 'utf8')
const total = (key: string) => [...lcov.matchAll(new RegExp(`^${key}:(\\d+)$`, 'gm'))].reduce((t, m) => t + Number(m[1]), 0)
const pct = (hit: number, found: number) => (found ? (100 * hit) / found : 100)
const results = [
  { what: 'lines', pct: pct(total('LH'), total('LF')) },
  { what: 'functions', pct: pct(total('FNH'), total('FNF')) },
]

let failed = false
for (const r of results) {
  const msg = `${r.what} coverage is ${r.pct.toFixed(1)}%`
  if (r.pct >= MIN) console.log(`ok: ${msg}`)
  else {
    failed = true
    console.error(`error: ${msg}, under the ${MIN}% minimum. Add tests for the uncovered lines in the table above.`)
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Coverage under ${MIN}%::${msg}`)
  }
}
process.exit(failed ? 1 : 0)
