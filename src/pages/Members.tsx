import { UsersManagement } from '@workos-inc/widgets'
import { Link } from 'react-router-dom'
import { PageHeader, SectionTitle } from '@/components/common'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Widgets } from '@/components/widgets'
import { pendingTasks } from '@/lib/reminders'
import { useStore } from '@/store'

// WorkOS's Users Management widget: list the CIC organization, invite people,
// change roles and remove members. It talks to WorkOS directly with a token
// from /api/widget-token, so nothing here goes through D1. Loaded lazily, so
// only admins download it.
//
// The widget's columns are WorkOS's own, so how many donors each board member
// looks after, and their pending tasks, are a table of ours above it, from the
// same records as All Donors and Notifications.
export default function Members() {
  const { widgetToken, boardMembers, donors, gifts, drafts, events, imports, today } = useStore()
  const count = (ownerId: string | null) => donors.filter((d) => d.ownerId === ownerId).length
  const rows: Row[] = boardMembers.map((m) => ({ id: m.id, name: m.name, email: m.email, donors: count(m.id), tasks: pendingTasks({ today, donors, gifts, drafts, events, imports }, m.id) }))
  const ids = new Set(boardMembers.map((m) => m.id))
  const unassigned = count(null)
  // Donors still assigned to someone who has left the board.
  const former = donors.filter((d) => d.ownerId && !ids.has(d.ownerId)).length

  return (
    <>
      <PageHeader title="Board members" />
      <section aria-labelledby="assigned-heading" className="mb-8">
        <SectionTitle><span id="assigned-heading">Donors and pending tasks</span></SectionTitle>
        <DataTable
          caption="Donors assigned to each board member, and their pending tasks"
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          initialSorting={[{ id: 'donors', desc: true }]}
          empty="No board members yet."
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {donors.length} donor{donors.length === 1 ? '' : 's'} in all.{' '}
          {unassigned > 0 && <><Link to="/all-donors" className="text-cic-dark underline">{unassigned} unassigned</Link>. </>}
          {former > 0 && <>{former} still assigned to a former board member. </>}
          Pending tasks are what each person's Notifications page lists as overdue or due: next steps, quarterly updates, lapsed donors and drafts to approve.
          Change assignments on <Link to="/all-donors" className="text-cic-dark underline">All Donors</Link>.
        </p>
      </section>
      <Widgets>
        <UsersManagement authToken={widgetToken} />
      </Widgets>
    </>
  )
}

type Row = { id: string; name: string; email: string; donors: number; tasks: { total: number; overdue: number } }

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Board member', meta: { className: 'font-medium' } },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'donors', header: 'Donors assigned', meta: { className: 'text-right tabular-nums' } },
  {
    id: 'tasks',
    header: 'Pending tasks',
    accessorFn: (r) => r.tasks.total,
    meta: { className: 'text-right tabular-nums' },
    cell: ({ row: { original: { tasks } } }) => (
      <>
        {tasks.total}
        {tasks.overdue > 0 && <span className="ml-1 font-semibold text-red-800">({tasks.overdue} overdue)</span>}
      </>
    ),
  },
]
