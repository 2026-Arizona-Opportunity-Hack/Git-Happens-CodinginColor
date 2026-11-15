import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Gift } from '../data/types'
import { funderPacket } from './packet'

const donor = { id: 'd1', name: 'APS Foundation', org: 'APS Foundation', ownerId: 'bm1', sources: [] }
const gift = (amount: number, date: string | null, program: Gift['program']): Gift => ({ id: `g${amount}`, donorId: 'd1', amount, date, source: 'benevity', program })
const gifts = [gift(5000, '2025-03-01', 'AI Academy'), gift(2500, '2026-04-01', 'AI Academy'), gift(1000, null, 'General')]

test('the packet totals giving by year and program, with every gift', () => {
  const p = funderPacket(donor, gifts, '2026-11-14')
  assert.match(p, /Lifetime: \$8,500 across 3 gifts/)
  assert.match(p, /- 2026: \$2,500/)
  assert.match(p, /- AI Academy: \$7,500/)
  assert.match(p, /\| Date unknown \| \$1,000 \| General/)
  assert.doesNotMatch(p, /outcome/i)
  assert.doesNotMatch(p, /\[/)
})
