import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileSpreadsheet } from 'lucide-react'
import { PageHeader, SectionTitle } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Donor } from '@/data/types'
import { fmtDate, money, UNASSIGNED } from '@/lib/logic'
import { donorsCsv, donorsXlsx, download } from '@/lib/export'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store'

// Every donor and who looks after them. This is where an admin manages board
// member responsibilities: pick a board member in a row, then Update (one row)
// or Update all (every changed row). Nothing is saved until then.
export default function AllDonors() {
  const { donors, gifts, boardMembers, assignOwners, ownerName, today } = useStore()
  const location = useLocation()
  // From the New Donors popup: {donorId: suggested board member}, not saved yet.
  const suggested = (location.state as { suggested?: Record<string, string> } | null)?.suggested ?? {}
  // Donors from that popup, plus any moved out of Unassigned here, stay at the
  // top of the main list (page 1), marked New, until the page is left.
  const [recent, setRecent] = useState<string[]>(() => Object.keys(suggested))
  // Unsaved dropdown choices, by donor. A row is "changed" when its choice
  // differs from what D1 holds.
  const [choices, setChoices] = useState<Record<string, string>>(() => ({ ...suggested }))
  const [saving, setSaving] = useState<Set<string>>(new Set())
  // Filters: name/org/email text, a donation date range (donors with at least
  // one gift in it), and board member ('' any, UNASSIGNED, or a member id).
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [owner, setOwner] = useState('')
  const filtering = !!(q || from || to || owner)
  const clearFilters = () => { setQ(''); setFrom(''); setTo(''); setOwner('') }

  const current = (d: Donor) => d.ownerId ?? UNASSIGNED
  const choice = (d: Donor) => choices[d.id] ?? current(d)
  const changed = donors.filter((d) => choice(d) !== current(d))
  const load = new Map(boardMembers.map((m) => [m.id, donors.filter((d) => d.ownerId === m.id).length]))
  const name = (id: string) => boardMembers.find((m) => m.id === id)?.name ?? 'Unassigned'

  const match = (d: Donor) =>
    `${d.name} ${d.org ?? ''} ${d.email ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()) &&
    (!owner || current(d) === owner) &&
    (!from && !to || gifts.some((g) => g.donorId === d.id && (!from || g.date >= from) && (!to || g.date <= to)))
  const rank = (d: Donor) => recent.indexOf(d.id)
  const inMain = (d: Donor) => !!d.ownerId || recent.includes(d.id)
  const assigned = donors
    .filter((d) => inMain(d) && match(d))
    .sort((a, b) => (rank(a) === -1 && rank(b) === -1 ? a.name.localeCompare(b.name) : rank(a) === -1 ? 1 : rank(b) === -1 ? -1 : rank(a) - rank(b)))
  const unassigned = donors.filter((d) => !inMain(d) && match(d)).sort((a, b) => a.name.localeCompare(b.name))
  const totalUnassigned = donors.filter((d) => !d.ownerId).length
  const shown = [...assigned, ...unassigned]

  const save = async (list: Donor[]) => {
    const ids = list.map((d) => d.id)
    setSaving((s) => new Set([...s, ...ids]))
    const ok = await assignOwners(list.map((d) => ({ donorId: d.id, ownerId: choice(d) === UNASSIGNED ? null : choice(d) })))
    setSaving((s) => new Set([...s].filter((id) => !ids.includes(id))))
    if (!ok) return
    // Donors that just got their first board member move up to the main list.
    const moved = list.filter((d) => !d.ownerId && choice(d) !== UNASSIGNED).map((d) => d.id)
    setRecent((r) => [...r, ...moved.filter((id) => !r.includes(id))])
    toast.success(list.length === 1
      ? `${list[0].name}: ${name(choice(list[0]))}`
      : `Updated ${list.length} donors`)
  }

  const items = [{ value: UNASSIGNED, label: 'Unassigned' }, ...boardMembers.map((m) => ({ value: m.id, label: `${m.name} (${load.get(m.id) ?? 0})` }))]
  const totals = (d: Donor) => {
    const gs = gifts.filter((g) => g.donorId === d.id)
    return { d, lifetime: gs.reduce((s, g) => s + g.amount, 0), last: gs.map((g) => g.date).sort().at(-1) }
  }
  const columns: ColumnDef<ReturnType<typeof totals>>[] = [
    {
      id: 'donor',
      header: 'Donor',
      accessorFn: (r) => r.d.name,
      cell: ({ row: { original: { d } } }) => (
        <>
          <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
          {recent.includes(d.id) && <Badge className="ml-2 bg-cic-dark text-white">New</Badge>}
          {d.org && d.org !== d.name && <div className="text-xs text-muted-foreground">{d.org}</div>}
          {!d.ownerId && choice(d) !== UNASSIGNED && <div className="text-xs text-amber-900">Suggested, not saved yet</div>}
        </>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (r) => r.d.email,
      sortUndefined: 'last',
      cell: ({ row: { original: { d } } }) => (
        <>
          <div>{d.email ?? '—'}</div>
          {d.phone && <div className="text-muted-foreground">{d.phone}</div>}
        </>
      ),
    },
    { id: 'lifetime', header: 'Lifetime', accessorFn: (r) => r.lifetime, cell: ({ getValue }) => money(getValue<number>()) },
    { id: 'last', header: 'Last gift', accessorFn: (r) => r.last, sortUndefined: 'last', cell: ({ getValue }) => (getValue<string>() ? fmtDate(getValue<string>()) : '—') },
    {
      id: 'sources',
      header: 'Sources',
      enableSorting: false,
      meta: { className: 'space-x-1' },
      cell: ({ row: { original: { d } } }) => d.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>),
    },
    {
      id: 'owner',
      header: 'Board member',
      accessorFn: (r) => name(current(r.d)),
      meta: { className: 'min-w-52' },
      cell: ({ row: { original: { d } } }) => (
        <Select items={items} value={choice(d)} onValueChange={(v) => setChoices((c) => ({ ...c, [d.id]: v as string }))}>
          <SelectTrigger aria-label={`Board member for ${d.name}`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {items.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'save',
      header: () => <span className="sr-only">Save</span>,
      enableSorting: false,
      cell: ({ row: { original: { d } } }) => (
        <Button size="sm" disabled={choice(d) === current(d) || saving.has(d.id)} onClick={() => save([d])} aria-label={`Update board member for ${d.name}`}>
          {saving.has(d.id) ? 'Saving…' : 'Update'}
        </Button>
      ),
    },
  ]

  const table = (rows: Donor[], caption: string, empty: string) => (
    <DataTable
      caption={caption}
      columns={columns}
      data={rows.map(totals)}
      getRowId={(r) => r.d.id}
      rowClassName={(r) => (recent.includes(r.original.d.id) ? 'bg-cic-tint!' : undefined)}
      empty={empty}
    />
  )

  return (
    <>
      <PageHeader
        title="All Donors"
        actions={
          // Exports the donors the filters show, as saved (not unsaved dropdown choices).
          <>
            <Button variant="outline" disabled={shown.length === 0} onClick={() => download(`all-donors-${today}.csv`, donorsCsv(shown, gifts, ownerName, today))}>
              <Download aria-hidden /> Export CSV
            </Button>
            <Button variant="outline" disabled={shown.length === 0} onClick={() => download(`all-donors-${today}.xlsx`, donorsXlsx(shown, gifts, ownerName, today))}>
              <FileSpreadsheet aria-hidden /> Export Excel
            </Button>
          </>
        }
        description={`Every donor and the board member responsible for them: ${donors.length} donors, ${totalUnassigned} unassigned. Choose a board member, then click Update for one row or Update all at the bottom.`}
      />
      <section aria-labelledby="filters-heading" className="mb-6 rounded-lg border bg-muted/40 p-4">
        <h2 id="filters-heading" className="mb-3 text-sm font-semibold text-cic-dark">Filters</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="f-name" className="mb-1">Name</Label>
            <Input id="f-name" placeholder="Name, org or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-from" className="mb-1">Donated from</Label>
            <Input id="f-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-to" className="mb-1">Donated to</Label>
            <Input id="f-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-owner" className="mb-1">Board member</Label>
            <select
              id="f-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <option value="">Any board member</option>
              <option value={UNASSIGNED}>Unassigned</option>
              {boardMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span aria-live="polite" className="text-muted-foreground">Showing {shown.length} of {donors.length} donors</span>
          {filtering && <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>}
        </div>
      </section>

      <section aria-labelledby="assigned-heading">
        <h2 id="assigned-heading" className="sr-only">Assigned donors</h2>
        {table(assigned, 'Assigned donors', filtering ? 'No assigned donors match these filters.' : 'No donors are assigned yet.')}
      </section>

      <section className="mt-10">
        <SectionTitle>Unassigned donors ({unassigned.length})</SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          Donors without a board member. Choose one and click Update to move the donor to the top of the list above.
        </p>
        {table(unassigned, 'Unassigned donors', filtering ? 'No unassigned donors match these filters.' : 'Every donor has a board member.')}
      </section>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-end gap-3 border-t bg-background py-3 pr-20">
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {changed.length ? `${changed.length} unsaved change${changed.length === 1 ? '' : 's'}` : 'No unsaved changes'}
        </span>
        <Button variant="ghost" disabled={!changed.length || saving.size > 0} onClick={() => setChoices({})}>Discard changes</Button>
        <Button disabled={!changed.length || saving.size > 0} onClick={() => save(changed)}>
          Update all{changed.length ? ` (${changed.length})` : ''}
        </Button>
      </div>
    </>
  )
}
