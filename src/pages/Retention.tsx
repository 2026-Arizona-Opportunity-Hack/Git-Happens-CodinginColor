import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, SectionTitle, StatusBadge } from '@/components/common'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sampleDonors, sampleGifts } from '@/data/retention-sample'
import { useStore } from '@/store'
import { money, periodLabel, periodOf, retentionStatus, totalsByPeriod, type Period, type RetentionStatus } from '@/lib/logic'

const ORDER: RetentionStatus[] = ['new', 'recovered', 'increased', 'same', 'decreased', 'lapsed']
const SHOWN = { year: 3, quarter: 4 } // how many periods get a tab

export default function Retention() {
  const store = useStore()
  const [sample, setSample] = useState(false)
  const { donors, gifts } = sample ? { donors: sampleDonors, gifts: sampleGifts } : store
  const [unit, setUnit] = useState<Period>('year')
  const current = periodOf(store.today, unit)
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
  const retained = rows.filter((r) => r.prev > 0 && r.cur > 0).length
  const active = rows.some((r) => r.prev > 0 || r.cur > 0)

  const sampleToggle = (
    <Button variant="outline" onClick={() => setSample(!sample)}>{sample ? 'Use real data' : 'Use sample data'}</Button>
  )

  return (
    <>
      <PageHeader
        title="Retention"
        description={`Who kept giving, who gave more, who stopped, ${noun} over ${noun}.`}
        actions={gifts.length > 0 || sample ? sampleToggle : undefined}
      />

      {sample && (
        <p className="mb-4 rounded-md border border-cic-dark bg-cic-tint px-3 py-2 text-sm text-cic-dark" role="status">
          Showing made-up sample donors. Nothing here is saved, and your real donors aren't changed.
        </p>
      )}

      {gifts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-lg font-semibold">No gifts recorded yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Retention compares what each donor gave in one period with the period before, so it needs some gift history.
              Import your donor spreadsheets or platform exports to get started, or preview the page with sample data.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/import" className={buttonVariants()}>Import donors</Link>
              {sampleToggle}
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
              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
                <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Retention rate</div>
                    <div className="text-3xl font-bold text-cic-dark">{prevDonors ? `${Math.round((retained / prevDonors) * 100)}%` : '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {prevDonors ? `${retained} of ${prevDonors} gave again` : `No one gave in ${label(period - 1)}`}
                    </div>
                  </CardContent>
                </Card>
                {ORDER.map((s) => (
                  <Card key={s}>
                    <CardContent>
                      <StatusBadge status={s} />
                      <div className="mt-2 text-2xl font-bold">{rows.filter((r) => r.status === s).length}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {ORDER.map((s) => {
                  const list = rows.filter((r) => r.status === s)
                  if (!list.length) return null
                  return (
                    <section key={s}>
                      <SectionTitle><span className="capitalize">{s}</span></SectionTitle>
                      <Card>
                        <CardContent>
                          <ul className="divide-y text-sm">
                            {list.map(({ d, cur, prev }) => (
                              <li key={d.id} className="flex justify-between gap-2 py-2">
                                {sample
                                  ? <span className="font-medium">{d.name}</span>
                                  : <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>}
                                <span className="text-muted-foreground">{money(prev)} → {money(cur)}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
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
