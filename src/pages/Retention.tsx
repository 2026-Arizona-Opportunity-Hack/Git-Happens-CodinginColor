import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, SectionTitle, StatusBadge } from '@/components/common'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/store'
import { money, retentionStatus, totalsByYear, yearOf, type RetentionStatus } from '@/lib/logic'

const ORDER: RetentionStatus[] = ['new', 'recovered', 'increased', 'same', 'decreased', 'lapsed']

export default function Retention() {
  const { donors, gifts, today } = useStore()
  const thisYear = yearOf(today)
  const years = [thisYear - 2, thisYear - 1, thisYear]
  const [year, setYear] = useState(thisYear)

  const rows = donors.map((d) => {
    const gs = gifts.filter((g) => g.donorId === d.id)
    const t = totalsByYear(gs)
    return { d, status: retentionStatus(gs, year), cur: t.get(year) ?? 0, prev: t.get(year - 1) ?? 0 }
  })
  const prevDonors = rows.filter((r) => r.prev > 0).length
  const retained = rows.filter((r) => r.prev > 0 && r.cur > 0).length

  return (
    <>
      <PageHeader title="Retention" description="Who kept giving, who gave more, who stopped, year over year." />
      <Tabs value={year} onValueChange={(v) => setYear(v as number)} className="mb-6">
        <TabsList>
          {years.map((y) => <TabsTrigger key={y} value={y}>{y} vs {y - 1}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
          <CardContent>
            <div className="text-sm text-muted-foreground">Retention rate</div>
            <div className="text-3xl font-bold text-cic-dark">{prevDonors ? Math.round((retained / prevDonors) * 100) : 0}%</div>
            <div className="text-xs text-muted-foreground">{retained} of {prevDonors} gave again</div>
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
                        <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
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
  )
}
