import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { test } from 'node:test'

// Coverage only counts files a test loads. Loading every module here means a
// new file in src/lib with no tests counts as uncovered and fails the 95% gate.
test('every src/lib module loads', async () => {
  const modules = readdirSync(import.meta.dirname).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  for (const f of modules) assert.ok(await import(`./${f}`), f)
})
