import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { PageHeader, Paged, Stat, StatusBadge } from '@/components/common'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/store'
import type { Gift, Source } from '@/data/types'
import { cohorts, lapseBy, money, periodLabel, periodOf, retentionStatus, totalsByPeriod, type Period, type RetentionStatus } from '@/lib/logic'

const SHOWN = { year: 6, quarter: 8 } // at most this many periods get a tab

// The six statuses, grouped by what the board does next.
const GROUPS: { title: string; statuses: RetentionStatus[]; empty: string }[] = [
  { title: 'Gave again', statuses: ['increased', 'same', 'decreased'], empty: 'No one gave in both periods.' },
  { title: 'New or back', statuses: ['new', 'recovered'], empty: 'No new or returning donors.' },
  { title: 'Stopped giving', statuses: ['lapsed'], empty: 'No one stopped giving.' },
]

export default function Retention() {
  const { donors, gifts, today } = useStore()
  const [unit, setUnit] = useState<Period>('year')
  const current = periodOf(today, unit)
  // Tabs run from the first period with a gift (or the one before now) up to
  // now, so older imports show up. Gifts with no date can't be placed.
  const dated = gifts.filter((g) => g.date)
  const undated = gifts.filter((g) => !g.date)
  const has = new Set(dated.map((g) => periodOf(g.date!, unit)))
  const first = Math.max(current - SHOWN[unit] + 1, Math.min(current - 1, ...[...has].map((n) => n + 1)))
  const periods = Array.from({ length: current - first + 1 }, (_, i) => first + i)
  const [picked, setPicked] = useState<number | null>(null)
  // Until someone picks a tab: now, unless now and the period before it have
  // no gifts, then the latest period that does.
  const latest = [...periods].reverse().find((n) => has.has(n) || has.has(n - 1)) ?? current
  const period = picked !== null && periods.includes(picked) ? picked : latest
  const label = (n: number) => periodLabel(n, unit)
  const noun = unit === 'year' ? 'year' : 'quarter'

  const rows = donors.map((d) => {
    const gs = gifts.filter((g) => g.donorId === d.id)
    const t = totalsByPeriod(gs, unit)
    return { d, status: retentionStatus(gs, period, unit), cur: t.get(period) ?? 0, prev: t.get(period - 1) ?? 0 }
  })
  const prevDonors = rows.filter((r) => r.prev > 0).length
  const curDonors = rows.filter((r) => r.cur > 0).length
  const retained = rows.filter((r) => r.prev > 0 && r.cur > 0).length
  const gained = rows.filter((r) => r.status === 'new' || r.status === 'recovered').length
  const lost = rows.filter((r) => r.status === 'lapsed').length
  const curTotal = rows.reduce((s, r) => s + r.cur, 0)
  const prevTotal = rows.reduce((s, r) => s + r.prev, 0)
  const active = prevDonors > 0 || curDonors > 0

  return (
    <>
      <PageHeader
        title="Retention"
        description={`Who kept giving, who gave more, who stopped, ${noun} over ${noun}.`}
      />

      {gifts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-lg font-semibold">No gifts recorded yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Import donors to see who keeps giving.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/import" className={buttonVariants()}>Import donors</Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {undated.length > 0 && (
            <p role="note" className="mb-4 rounded-md border border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {undated.length} gift{undated.length === 1 ? '' : 's'} ({money(undated.reduce((t, g) => t + g.amount, 0))}) {undated.length === 1 ? 'has' : 'have'} no date, so {undated.length === 1 ? 'it isn’t' : 'they aren’t'} counted here.
              {' '}Import the file again with its date column mapped to <em>Gift date</em> and they’ll get their dates without being counted twice.
              {' '}<Link to="/import" className="font-medium underline">Update Donors</Link>
            </p>
          )}
          <div className="mb-6 flex flex-wrap gap-3">
            <Tabs value={unit} onValueChange={(v) => { setUnit(v as Period); setPicked(null) }}>
              <TabsList aria-label="Compare by">
                <TabsTrigger value="year">Yearly</TabsTrigger>
                <TabsTrigger value="quarter">Quarterly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={period} onValueChange={(v) => setPicked(v as number)}>
              <TabsList aria-label="Period" className="flex-wrap justify-start group-data-horizontal/tabs:h-auto">
                {periods.map((n) => <TabsTrigger key={n} value={n} className="h-7 flex-none">{label(n)} vs {label(n - 1)}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>

          {!active ? (
            <Card>
              <CardContent className="py-10 text-center">
                <h2 className="text-lg font-semibold">No gifts in {label(period)} or {label(period - 1)}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Pick another {noun} above to compare.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <Stat
                  label="Retention rate"
                  value={prevDonors ? `${Math.round((retained / prevDonors) * 100)}%` : '—'}
                  hint={prevDonors ? `${retained} of ${prevDonors} ${label(period - 1)} donors gave again` : `No one gave in ${label(period - 1)}`}
                />
                <Stat label={`Donors in ${label(period)}`} value={curDonors} hint={`${prevDonors} in ${label(period - 1)} · ${gained} new or back · ${lost} stopped`} />
                <Stat
                  label={`Given in ${label(period)}`}
                  value={money(curTotal)}
                  hint={`${money(prevTotal)} in ${label(period - 1)}${prevTotal ? ` (${curTotal >= prevTotal ? '+' : '−'}${Math.round((Math.abs(curTotal - prevTotal) / prevTotal) * 100)}%)` : ''}`}
                />
              </div>

              <div className="grid items-start gap-6 lg:grid-cols-3">
                {GROUPS.map((g) => {
                  const list = rows.filter((r) => g.statuses.includes(r.status))
                    .sort((a, b) => g.statuses.indexOf(a.status) - g.statuses.indexOf(b.status) || Math.max(b.cur, b.prev) - Math.max(a.cur, a.prev))
                  return (
                    <section key={g.title} aria-labelledby={`group-${g.title}`}>
                      <h2 id={`group-${g.title}`} className="mb-2 flex items-baseline gap-2 text-lg font-semibold text-cic-dark">
                        {g.title} <span className="text-sm font-normal text-muted-foreground">{list.length}</span>
                      </h2>
                      <Card className="gap-0 py-0">
                        {list.length ? (
                          <Paged items={list} label={g.title} className="px-4 py-3">{(page) => (
                          <ul className="divide-y">
                            {page.map((r) => (
                              <li key={r.d.id}>
                                <Link to={`/donors/${r.d.id}`} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-medium text-cic-dark">{r.d.name}</span>
                                    <span className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground tabular-nums">
                                      <StatusBadge status={r.status} /> {money(r.prev)} → {money(r.cur)}
                                    </span>
                                  </span>
                                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                </Link>
                              </li>
                            ))}
                          </ul>
                          )}</Paged>
                        ) : (
                          <p className="px-4 py-3 text-sm text-muted-foreground">{g.empty}</p>
                        )}
                      </Card>
                    </section>
                  )
                })}
              </div>
            </>
          )}

          <Patterns gifts={gifts} unit={unit} current={current} period={period} />
        </>
      )}
    </>
  )
}

// Patterns of churn and activation under the per-donor lists: do first-time
// donors come back, and which sources and programs lose donors.
const COHORTS = { year: 4, quarter: 6 }
const SOURCE_LABEL: Record<Source, string> = { spreadsheet: 'Spreadsheet', zeffy: 'Zeffy', benevity: 'Benevity', azgives: 'AZ Gives', unitedway: 'United Way' }
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—')

function Patterns({ gifts, unit, current, period }: { gifts: Gift[]; unit: Period; current: number; period: number }) {
  const label = (n: number) => periodLabel(n, unit)
  const noun = unit === 'year' ? 'year' : 'quarter'
  const rows = cohorts(gifts, unit, current, COHORTS[unit])
  const later = COHORTS[unit] - 1
  return (
    <section aria-labelledby="patterns" className="mt-10">
      <h2 id="patterns" className="mb-1 text-lg font-semibold text-cic-dark">Patterns</h2>
      <p className="mb-4 text-sm text-muted-foreground">Whether first-time donors give again, and where donors stop.</p>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardContent>
            <h3 id="cohorts" className="font-semibold">Do first-time donors give again?</h3>
            <p className="mb-3 text-sm text-muted-foreground">Donors grouped by the {noun} of their first gift, and the share who gave again each {noun} after.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums" aria-labelledby="cohorts">
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-2 pr-4 font-medium">First gift</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Donors</th>
                    {Array.from({ length: later }, (_, i) => <th key={i} scope="col" className="py-2 pr-4 font-medium">{i + 1} {noun}{i ? 's' : ''} later</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.period} className="border-b last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-medium">{label(c.period)}</th>
                      <td className="py-2 pr-4">{c.size}</td>
                      {Array.from({ length: later }, (_, i) => (
                        <td key={i} className="py-2 pr-4">
                          {i < c.gaveAgain.length && c.size ? <>{pct(c.gaveAgain[i], c.size)} <span className="text-muted-foreground">({c.gaveAgain[i]})</span></> : <span className="text-muted-foreground" aria-label="Not yet">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {(['source', 'program'] as const).map((by) => {
          const list = lapseBy(gifts, unit, period, by)
          const id = `lapse-${by}`
          return (
            <Card key={by}>
              <CardContent>
                <h3 id={id} className="font-semibold">Who stopped, by {by}</h3>
                <p className="mb-3 text-sm text-muted-foreground">Of {label(period - 1)} donors, the share who gave nothing in {label(period)}.</p>
                {list.length ? (
                  <table className="w-full text-sm tabular-nums" aria-labelledby={id}>
                    <thead>
                      <tr className="border-b text-left">
                        <th scope="col" className="py-2 pr-4 font-medium">{by === 'source' ? 'Source' : 'Program'}</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Gave in {label(period - 1)}</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Stopped</th>
                        <th scope="col" className="py-2 font-medium">Lapse rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr key={r.key} className="border-b last:border-0">
                          <th scope="row" className="py-2 pr-4 text-left font-medium">{by === 'source' ? SOURCE_LABEL[r.key as Source] ?? r.key : r.key}</th>
                          <td className="py-2 pr-4">{r.gave}</td>
                          <td className="py-2 pr-4">{r.lapsed}</td>
                          <td className="py-2">{pct(r.lapsed, r.gave)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground">No one gave in {label(period - 1)}.</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
