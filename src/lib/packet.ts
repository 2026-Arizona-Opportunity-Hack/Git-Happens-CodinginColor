import type { Donor, Gift, Program, ProgramOutcome } from '../data/types'
import { byDateDesc, money, totalsByYear } from './logic'

// Total given to each program, most-funded first.
export function programTotals(gifts: Gift[]): [Program, number][] {
  const t = new Map<Program, number>()
  for (const g of gifts) t.set(g.program, (t.get(g.program) ?? 0) + g.amount)
  return [...t.entries()].sort((a, b) => b[1] - a[1])
}

// What a program achieved, in one sentence or two.
export const outcomeText = (o: ProgramOutcome) =>
  `${o.summary.trim()}${o.studentsServed ? ` (${o.studentsServed.toLocaleString('en-US')} students served)` : ''}`

// The outcomes worth telling a donor about: the programs they funded that have
// something entered. "General" only counts when they funded nothing else.
export function fundedOutcomes(gifts: Gift[], outcomes: ProgramOutcome[]): ProgramOutcome[] {
  const programs = programTotals(gifts).map(([p]) => p)
  const specific = programs.filter((p) => p !== 'General')
  return (specific.length ? specific : programs)
    .map((p) => outcomes.find((o) => o.program === p))
    .filter((o): o is ProgramOutcome => !!o?.summary.trim())
}

// One-click funder packet (Markdown): totals, gift history, and the outcomes
// of every program the donor funded, ready to paste into a renewal.
export function funderPacket(d: Donor, gifts: Gift[], outcomes: ProgramOutcome[], today: string): string {
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
    '',
    '## Funded outcomes',
    ...byProgram.flatMap(([p]) => {
      const o = outcomes.find((x) => x.program === p)
      return [`### ${p}`, o?.summary.trim() ? outcomeText(o) : 'No outcomes entered yet. Add them on the Program outcomes page.', '']
    }),
  ].join('\n')
}
