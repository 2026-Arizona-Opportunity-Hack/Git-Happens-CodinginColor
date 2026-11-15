import type { Donor, Gift, Program } from '../data/types'
import { byDateDesc, money, totalsByYear } from './logic'

// Total given to each program, most-funded first.
export function programTotals(gifts: Gift[]): [Program, number][] {
  const t = new Map<Program, number>()
  for (const g of gifts) t.set(g.program, (t.get(g.program) ?? 0) + g.amount)
  return [...t.entries()].sort((a, b) => b[1] - a[1])
}

// One-click funder packet (Markdown): totals, giving by year and program, and
// gift history, ready to paste into a renewal.
export function funderPacket(d: Donor, gifts: Gift[], today: string): string {
  const sorted = [...gifts].sort(byDateDesc)
  const byYear = [...totalsByYear(gifts).entries()].sort((a, b) => b[0] - a[0])
  const byProgram = programTotals(gifts)
  return [
    `# Funder packet: ${d.name}`,
    '',
    `Coding in Color · prepared ${today}${d.org ? ` · ${d.org}` : ''}`,
    '',
    '## Giving summary',
    `- Lifetime: ${money(gifts.reduce((s, g) => s + g.amount, 0))} across ${gifts.length} gift${gifts.length === 1 ? '' : 's'}`,
    ...byYear.map(([y, v]) => `- ${y}: ${money(v)}`),
    '',
    '## By program',
    ...byProgram.map(([p, v]) => `- ${p}: ${money(v)}`),
    '',
    '## Gift history',
    '| Date | Amount | Program | Source |',
    '|---|---|---|---|',
    ...sorted.map((g) => `| ${g.date ?? 'Date unknown'} | ${money(g.amount)} | ${g.program} | ${g.source} |`),
  ].join('\n')
}
