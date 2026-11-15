import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components/common'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStore } from '@/store'
import { fmtDate, money, retentionStatus, yearOf } from '@/lib/logic'
import { donorsCsv, donorsXlsx, download } from '@/lib/export'

// The signed-in person's own donors. Admins see everyone's on All Donors.
export default function Donors() {
  const { donors, gifts, session, today, ownerName } = useStore()
  const [q, setQ] = useState('')
  const mine = donors.filter((d) => d.ownerId === session.memberId)
  const rows = mine
    .filter((d) => `${d.name} ${d.org ?? ''} ${d.email ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .map((d) => {
      const gs = gifts.filter((g) => g.donorId === d.id)
      return {
        d,
        lifetime: gs.reduce((s, g) => s + g.amount, 0),
        last: gs.map((g) => g.date).sort().at(-1),
        status: retentionStatus(gs, yearOf(today)),
      }
    })
    .sort((a, b) => b.lifetime - a.lifetime)

  return (
    <>
      <PageHeader
        title="My Donors"
        actions={
          <>
            <Button variant="outline" disabled={mine.length === 0} onClick={() => download(`my-donors-${today}.csv`, donorsCsv(mine, gifts, ownerName, today))}>
              <Download aria-hidden /> Export CSV
            </Button>
            <Button variant="outline" disabled={mine.length === 0} onClick={() => download(`my-donors-${today}.xlsx`, donorsXlsx(mine, gifts, ownerName, today))}>
              <FileSpreadsheet aria-hidden /> Export Excel
            </Button>
          </>
        }
        description={`The ${mine.length} donor${mine.length === 1 ? '' : 's'} assigned to you, deduped across the spreadsheet, Zeffy, Benevity, AZ Gives and United Way.`}
      />
      <Input className="mb-4 max-w-sm" placeholder="Search name, org or email" aria-label="Search donors" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-cic-dark hover:bg-cic-dark">
              {['Donor', 'Lifetime', 'Last gift', 'Status', 'Next step', 'Sources'].map((h) => (
                <TableHead key={h} className="text-white">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ d, lifetime, last, status }) => (
              <TableRow key={d.id} className="even:bg-cic-tint/60">
                <TableCell>
                  <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                  {d.org && d.org !== d.name && <div className="text-xs text-muted-foreground">{d.org}</div>}
                </TableCell>
                <TableCell>{money(lifetime)}</TableCell>
                <TableCell>{last ? fmtDate(last) : '—'}</TableCell>
                <TableCell><StatusBadge status={status} /></TableCell>
                <TableCell className="max-w-56 truncate">
                  {d.nextStep ? (
                    <span className={d.nextStep.due < today ? 'font-semibold text-red-800' : ''}>
                      {d.nextStep.text} · {fmtDate(d.nextStep.due)}
                    </span>
                  ) : <span className="text-muted-foreground">None</span>}
                </TableCell>
                <TableCell className="space-x-1">
                  {d.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  {mine.length === 0 ? 'No donors are assigned to you yet.' : 'No donors match that search.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
