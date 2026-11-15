import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components/common'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store'
import type { Donor } from '@/data/types'
import { fmtDate, lastGiftDate, money, retentionStatus, yearOf } from '@/lib/logic'
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
        last: lastGiftDate(gs),
        status: retentionStatus(gs, yearOf(today)),
      }
    })

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
      <DataTable
        caption="My donors"
        columns={columns(today)}
        data={rows}
        getRowId={(r) => r.d.id}
        initialSorting={[{ id: 'lifetime', desc: true }]}
        empty={mine.length === 0 ? 'No donors are assigned to you yet.' : 'No donors match that search.'}
      />
    </>
  )
}

type DonorRow = { d: Donor; lifetime: number; last?: string; status: ReturnType<typeof retentionStatus> }

const columns = (today: string): ColumnDef<DonorRow>[] => [
  {
    id: 'donor',
    header: 'Donor',
    accessorFn: (r) => r.d.name,
    cell: ({ row: { original: { d } } }) => (
      <>
        <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
        {d.org && d.org !== d.name && <div className="text-xs text-muted-foreground">{d.org}</div>}
      </>
    ),
  },
  { id: 'lifetime', header: 'Lifetime', accessorFn: (r) => r.lifetime, cell: ({ getValue }) => money(getValue<number>()) },
  // Undefined dates sort last whichever way the column goes.
  { id: 'last', header: 'Last gift', accessorFn: (r) => r.last, sortUndefined: 'last', cell: ({ getValue }) => (getValue<string>() ? fmtDate(getValue<string>()) : '—') },
  { id: 'status', header: 'Status', accessorFn: (r) => r.status, cell: ({ getValue }) => <StatusBadge status={getValue<DonorRow['status']>()} /> },
  {
    id: 'next',
    header: 'Next step',
    accessorFn: (r) => r.d.nextStep?.due,
    sortUndefined: 'last',
    meta: { className: 'max-w-56 truncate' },
    cell: ({ row: { original: { d } } }) =>
      d.nextStep ? (
        <span className={d.nextStep.due < today ? 'font-semibold text-red-800' : ''}>
          {d.nextStep.text} · {fmtDate(d.nextStep.due)}
        </span>
      ) : <span className="text-muted-foreground">None</span>,
  },
  {
    id: 'sources',
    header: 'Sources',
    enableSorting: false,
    meta: { className: 'space-x-1' },
    cell: ({ row: { original: { d } } }) => d.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>),
  },
]
