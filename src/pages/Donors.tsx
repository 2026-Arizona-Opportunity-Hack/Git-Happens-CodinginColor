import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStore } from '@/store'
import { fmtDate, money, retentionStatus, yearOf } from '@/lib/logic'

export default function Donors() {
  const { visibleDonors, gifts, member, today } = useStore()
  const [q, setQ] = useState('')
  const rows = visibleDonors
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
      <PageHeader title="Donors" description="One deduped list across the spreadsheet, Zeffy, Benevity, AZ Gives and United Way." />
      <Input className="mb-4 max-w-sm" placeholder="Search name, org or email" aria-label="Search donors" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-cic-dark hover:bg-cic-dark">
              {['Donor', 'Owner', 'Lifetime', 'Last gift', 'Status', 'Next step', 'Sources'].map((h) => (
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
                <TableCell>{member(d.ownerId).name}</TableCell>
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
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
