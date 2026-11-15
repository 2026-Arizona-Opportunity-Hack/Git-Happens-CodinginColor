import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components/common'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { DonorFilterBar, FilterSelect } from '@/components/DonorFilters'
import { useDonorFilters } from '@/components/useDonorFilters'
import { useStore } from '@/store'
import type { Donor } from '@/data/types'
import { fmtDate, lastGiftDate, money, retentionStatus, yearOf, type RetentionStatus } from '@/lib/logic'
import { donorsCsv, donorsXlsx, download } from '@/lib/export'

// The signed-in person's own donors. Admins see everyone's on All Donors.
export default function Donors() {
  const { donors, gifts, session, today, ownerName } = useStore()
  // Filters: name, donation dates, this year's status, and next step.
  const f = useDonorFilters(gifts)
  const [status, setStatus] = useState('')
  const [step, setStep] = useState<'' | NextFilter>('')
  const filtering = f.active || !!status || !!step
  const clearFilters = () => { f.clear(); setStatus(''); setStep('') }
  const mine = donors.filter((d) => d.ownerId === session.memberId)
  const all = mine.map((d) => {
    const gs = gifts.filter((g) => g.donorId === d.id)
    return {
      d,
      lifetime: gs.reduce((s, g) => s + g.amount, 0),
      last: lastGiftDate(gs),
      status: retentionStatus(gs, yearOf(today)),
    }
  })
  const rows = all.filter((r) => f.match(r.d) && (!status || r.status === status) && (!step || nextMatches(step, r.d, today)))

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
      <DataTable
        caption="My donors"
        toolbar={
          <DonorFilterBar
            f={f}
            active={filtering}
            onClear={clearFilters}
            summary={`Showing ${rows.length} of ${mine.length} donors`}
            extra={
              <>
                <FilterSelect
                  label={`Status ${yearOf(today)}`}
                  value={status}
                  onChange={setStatus}
                  options={[{ value: '', label: 'Any status' }, ...STATUSES.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))]}
                />
                <FilterSelect
                  label="Next step"
                  value={step}
                  onChange={(v) => setStep(v as NextFilter)}
                  options={[{ value: '', label: 'Any' }, { value: 'overdue', label: 'Overdue' }, { value: 'week', label: 'Due in the next 7 days' }, { value: 'set', label: 'Has a next step' }, { value: 'none', label: 'No next step' }]}
                />
              </>
            }
          />
        }
        columns={columns(today)}
        data={rows}
        getRowId={(r) => r.d.id}
        initialSorting={[{ id: 'lifetime', desc: true }]}
        empty={mine.length === 0 ? 'No donors are assigned to you yet.' : 'No donors match these filters.'}
      />
    </>
  )
}

const STATUSES: RetentionStatus[] = ['new', 'increased', 'same', 'decreased', 'recovered', 'lapsed', 'inactive']

type NextFilter = 'overdue' | 'week' | 'set' | 'none'
function nextMatches(f: NextFilter, d: Donor, today: string) {
  const due = d.nextStep?.due
  if (f === 'none') return !due
  if (!due) return false
  if (f === 'overdue') return due < today
  if (f === 'week') {
    const end = new Date(today + 'T00:00:00Z')
    end.setUTCDate(end.getUTCDate() + 7)
    return due >= today && due <= end.toISOString().slice(0, 10)
  }
  return true
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
