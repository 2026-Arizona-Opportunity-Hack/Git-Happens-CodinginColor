import { Link } from 'react-router-dom'
import { PageHeader, SectionTitle, Stat } from '@/components/common'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { useStore } from '@/store'
import { fmtDate, money, quarterlyTouchDue, retentionStatus, yearOf } from '@/lib/logic'

export default function Dashboard() {
  const { donors, gifts, interactions, boardMembers, events, today, member, session } = useStore()
  const year = yearOf(today)
  const ids = new Set(donors.map((d) => d.id))
  const myGifts = gifts.filter((g) => ids.has(g.donorId))
  const ytd = myGifts.filter((g) => yearOf(g.date) === year).reduce((s, g) => s + g.amount, 0)
  const overdue = donors.filter((d) => d.nextStep && d.nextStep.due < today)
  const touchDue = donors.filter((d) => quarterlyTouchDue(d, today))
  const lapsed = donors.filter((d) => retentionStatus(myGifts.filter((g) => g.donorId === d.id), year) === 'lapsed')

  return (
    <>
      <PageHeader
        title={session.role === 'admin' ? 'Organization overview' : `Welcome, ${member(session.memberId).name.split(' ')[0]}`}
        description={session.role === 'admin' ? 'Donor health across every board member.' : 'Your donors and what needs doing this week.'}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={`Raised ${year} YTD`} value={money(ytd)} />
        <Stat label="Donors" value={donors.length} />
        <Stat label="Overdue next steps" value={overdue.length} hint="Past their due date" />
        <Stat label="Lapsed this year" value={lapsed.length} hint={`Gave in ${year - 1}, not ${year}`} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        {session.role === 'admin' && (
          <section>
            <SectionTitle>Board member load</SectionTitle>
            <DataTable
              caption="Board member load"
              columns={loadColumns}
              data={boardMembers.map((m) => {
                const mine = donors.filter((d) => d.ownerId === m.id)
                return {
                  id: m.id,
                  name: m.name,
                  donors: mine.length,
                  touchDue: mine.filter((d) => quarterlyTouchDue(d, today)).length,
                  overdue: mine.filter((d) => d.nextStep && d.nextStep.due < today).length,
                }
              })}
              getRowId={(r) => r.id}
            />

          </section>
        )}
        {session.role === 'board' && (
          <section>
            <SectionTitle>This week</SectionTitle>
            <Card>
              <CardContent className="space-y-2">
                <p><strong>{overdue.length}</strong> overdue next steps, <strong>{touchDue.length}</strong> donors due a quarterly update.</p>
                <Link className="font-semibold text-cic-dark underline" to="/follow-ups">Open follow-ups →</Link>
              </CardContent>
            </Card>
          </section>
        )}

        <section>
          <SectionTitle>Upcoming CIC events</SectionTitle>
          <Card>
            <CardContent>
              <ul className="space-y-2">
                {events.filter((e) => e.date >= today).map((e) => (
                  <li key={e.id} className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted-foreground">{fmtDate(e.date)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="mt-8">
        <SectionTitle>Recent activity</SectionTitle>
        <Card>
          <CardContent>
            <ul className="divide-y">
              {interactions.filter((i) => ids.has(i.donorId)).slice(0, 6).map((i) => (
                <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>
                    <Link className="font-medium text-cic-dark underline" to={`/donors/${i.donorId}`}>
                      {donors.find((d) => d.id === i.donorId)?.name}
                    </Link>{' '}
                    · {i.channel} · {i.summary}
                  </span>
                  <span className="text-muted-foreground">{member(i.byId).name} · {fmtDate(i.date)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </>
  )
}

type Load = { id: string; name: string; donors: number; touchDue: number; overdue: number }

const loadColumns: ColumnDef<Load>[] = [
  { accessorKey: 'name', header: 'Board member', meta: { className: 'font-medium' } },
  { accessorKey: 'donors', header: 'Donors', meta: { className: 'text-right' } },
  { accessorKey: 'touchDue', header: 'Touch due', meta: { className: 'text-right' } },
  { accessorKey: 'overdue', header: 'Overdue', meta: { className: 'text-right' } },
]
