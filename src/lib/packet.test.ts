import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Gift, ProgramOutcome } from '../data/types'
import { fundedOutcomes, funderPacket } from './packet'

const donor = { id: 'd1', name: 'APS Foundation', org: 'APS Foundation', ownerId: 'bm1', sources: [] }
const gift = (amount: number, date: string | null, program: Gift['program']): Gift => ({ id: `g${amount}`, donorId: 'd1', amount, date, source: 'benevity', program })
const gifts = [gift(5000, '2025-03-01', 'AI Academy'), gift(2500, '2026-04-01', 'AI Academy'), gift(1000, null, 'General')]
const outcomes: ProgramOutcome[] = [{ program: 'AI Academy', studentsServed: 96, summary: 'Cohorts gained 32 points on loops.' }]

test('the packet totals giving and quotes outcomes for every funded program', () => {
  const p = funderPacket(donor, gifts, outcomes, '2026-11-14')
  assert.match(p, /Lifetime: \$8,500 across 3 gifts/)
  assert.match(p, /- 2026: \$2,500/)
  assert.match(p, /- AI Academy: \$7,500/)
  assert.match(p, /### AI Academy\nCohorts gained 32 points on loops\. \(96 students served\)/)
  assert.match(p, /### General\nNo outcomes entered yet/)
  assert.match(p, /\| Date unknown \| \$1,000 \| General/)
  assert.doesNotMatch(p, /\[/)
})

test('General outcomes count only when a donor funded nothing more specific', () => {
  const all: ProgramOutcome[] = [...outcomes, { program: 'General', studentsServed: null, summary: 'CS for Arizona high schoolers.' }]
  assert.deepEqual(fundedOutcomes(gifts, all).map((o) => o.program), ['AI Academy'])
  assert.deepEqual(fundedOutcomes([gift(50, '2026-01-01', 'General')], all).map((o) => o.program), ['General'])
  assert.deepEqual(fundedOutcomes(gifts, []), [])
})
