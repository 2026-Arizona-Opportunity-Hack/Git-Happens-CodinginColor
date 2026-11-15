import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { PageHeader, Stat, StatusBadge } from '@/components/common'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/store'
import { money, periodLabel, periodOf, retentionStatus, totalsByPeriod, type Period, type RetentionStatus } from '@/lib/logic'

const SHOWN = { year: 3, quarter: 4 } // how many periods get a tab

// The six statuses, grouped by what the board does next.
const GROUPS: { title: string; statuses: RetentionStatus[]; empty: string }[] = [
  { title: 'Gave again', statuses: ['increased', 'same', 'decreased'], empty: 'No one gave in both periods.' },
  { title: 'New or back', statuses: ['new', 'recovered'], empty: 'No new or returning donors.' },
  { title: 'Stopped giving', statuses: ['lapsed'], empty: 'No one stopped giving.' },
]

export default function Retention() {
  const { donors, gifts, today, setSample } = useStore()
  const [unit, setUnit] = useState<Period>('year')
  const current = periodOf(today, unit)
  const periods = Array.from({ length: SHOWN[unit] }, (_, i) => current - SHOWN[unit] + 1 + i)
  const [picked, setPicked] = useState<number | null>(null)
  const period = picked !== null && periods.includes(picked) ? picked : current
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
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Import donors to see who keeps giving, or try the page with sample data.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/import" className={buttonVariants()}>Import donors</Link>
              <Button variant="outline" onClick={() => setSample(true)}>Use sample data</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <Tabs value={unit} onValueChange={(v) => setUnit(v as Period)}>
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
                      <Card className="py-0">
                        {list.length ? (
                          <ul className="divide-y">
                            {list.map((r) => (
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
        </>
      )}
    </>
  )
}
