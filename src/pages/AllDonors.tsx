import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, Sparkles } from 'lucide-react'
import { PageHeader, SectionTitle } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef, type Filters } from '@/components/ui/data-table'
import { applyFilters } from '@/components/ui/filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Donor } from '@/data/types'
import { fmtDate, lastGiftDate, money, suggestOwners, UNASSIGNED } from '@/lib/logic'
import { donorsCsv, donorsXlsx, download } from '@/lib/export'
import { donorTextFilter, giftDateFilter, sourceFilter } from '@/lib/donor-columns'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

// Every donor and who looks after them. This is where an admin manages board
// member responsibilities: pick board members in the rows, or let Suggest
// assignment fill the unassigned ones (changed rows turn amber), then Save at
// the bottom. Nothing is saved until then.
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
  const [saving, setSaving] = useState(false)
  // Column filters (header buttons, as in Excel), shared by both tables.
  const [filters, setFilters] = useState<Filters>({})
  const filtering = Object.keys(filters).length > 0

  const current = (d: Donor) => d.ownerId ?? UNASSIGNED
  const choice = (d: Donor) => choices[d.id] ?? current(d)
  const isChanged = (d: Donor) => choice(d) !== current(d)
  const changed = donors.filter(isChanged)
  const load = new Map(boardMembers.map((m) => [m.id, donors.filter((d) => d.ownerId === m.id).length]))
  const name = (id: string) => boardMembers.find((m) => m.id === id)?.name ?? 'Unassigned'

  const rank = (d: Donor) => recent.indexOf(d.id)
  const inMain = (d: Donor) => !!d.ownerId || recent.includes(d.id)
  const assigned = donors
    .filter(inMain)
    .sort((a, b) => (rank(a) === -1 && rank(b) === -1 ? a.name.localeCompare(b.name) : rank(a) === -1 ? 1 : rank(b) === -1 ? -1 : rank(a) - rank(b)))
  const unassigned = donors.filter((d) => !inMain(d)).sort((a, b) => a.name.localeCompare(b.name))

  const save = async (list: Donor[]) => {
    setSaving(true)
    const ok = await assignOwners(list.map((d) => ({ donorId: d.id, ownerId: choice(d) === UNASSIGNED ? null : choice(d) })))
    setSaving(false)
    if (!ok) return
    // Donors that just got their first board member move up to the main list.
    const moved = list.filter((d) => !d.ownerId && choice(d) !== UNASSIGNED).map((d) => d.id)
    setRecent((r) => [...r, ...moved.filter((id) => !r.includes(id))])
    toast.success(list.length === 1
      ? `${list[0].name}: ${name(choice(list[0]))}`
      : `Saved ${list.length} donors`)
  }

  // Fills in a board member for each unassigned donor the filters show that
  // has no choice yet: whoever has the fewest, counting unsaved choices, spread
  // as it goes. Nothing is saved until Save.
  const suggest = (list: Donor[]) => {
    const todo = list.filter((d) => !isChanged(d)).map((d) => d.id)
    if (!todo.length || !boardMembers.length) return
    const load = donors.map((d) => ({ ownerId: choice(d) === UNASSIGNED ? null : choice(d) }))
    const picks = suggestOwners(boardMembers, load, todo)
    setChoices((c) => ({ ...c, ...Object.fromEntries(picks) }))
    toast.info(`Suggested a board member for ${todo.length} donor${todo.length === 1 ? '' : 's'}. Check them, then Save.`)
  }

  const items = [{ value: UNASSIGNED, label: 'Unassigned' }, ...boardMembers.map((m) => ({ value: m.id, label: `${m.name} (${load.get(m.id) ?? 0})` }))]
  const totals = (d: Donor) => {
    const gs = gifts.filter((g) => g.donorId === d.id)
    return { d, lifetime: gs.reduce((s, g) => s + g.amount, 0), last: lastGiftDate(gs) }
  }
  const columns: ColumnDef<ReturnType<typeof totals>>[] = [
    {
      id: 'donor',
      header: 'Donor',
      accessorFn: (r) => r.d.name,
      meta: { filter: donorTextFilter() },
      cell: ({ row: { original: { d } } }) => (
        <>
          <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
          {recent.includes(d.id) && <Badge className="ml-2 bg-cic-dark text-white">New</Badge>}
          {d.org && d.org !== d.name && <div className="text-xs text-muted-foreground">{d.org}</div>}
        </>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (r) => r.d.email,
      sortUndefined: 'last',
      meta: { filter: { kind: 'text', placeholder: 'Email or phone', text: (r) => `${r.d.email ?? ''} ${r.d.phone ?? ''}` } },
      cell: ({ row: { original: { d } } }) => (
        <>
          <div>{d.email ?? '—'}</div>
          {d.phone && <div className="text-muted-foreground">{d.phone}</div>}
        </>
      ),
    },
    { id: 'lifetime', header: 'Lifetime', accessorFn: (r) => r.lifetime, cell: ({ getValue }) => money(getValue<number>()) },
    { id: 'last', header: 'Last gift', accessorFn: (r) => r.last, sortUndefined: 'last', meta: { filter: giftDateFilter(gifts) }, cell: ({ getValue }) => (getValue<string>() ? fmtDate(getValue<string>()) : '—') },
    {
      id: 'sources',
      header: 'Sources',
      enableSorting: false,
      meta: { className: 'space-x-1', filter: sourceFilter() },
      cell: ({ row: { original: { d } } }) => d.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>),
    },
    {
      id: 'owner',
      header: 'Board member',
      accessorFn: (r) => name(current(r.d)),
      // Filters on the saved board member, not an unsaved choice.
      meta: { className: 'min-w-52', filter: { kind: 'options', values: (r) => [current(r.d)], order: [UNASSIGNED, ...boardMembers.map((m) => m.id)], label: name } },
      // A changed choice turns amber and says so in words, not only in color.
      cell: ({ row: { original: { d } } }) => {
        const dirty = isChanged(d)
        return (
          <>
            <Select items={items} value={choice(d)} onValueChange={(v) => setChoices((c) => ({ ...c, [d.id]: v as string }))}>
              <SelectTrigger
                aria-label={`Board member for ${d.name}`}
                aria-describedby={dirty ? `unsaved-${d.id}` : undefined}
                className={cn('w-full', dirty && 'border-amber-600 bg-amber-100 font-medium text-amber-950 ring-1 ring-amber-600')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {dirty && (
              <div id={`unsaved-${d.id}`} className="mt-1 text-xs font-medium text-amber-900">
                {d.ownerId ? `Was ${name(current(d))}. Not saved yet` : 'Suggested, not saved yet'}
              </div>
            )}
          </>
        )
      },
    },
  ]

  const allRows = donors.map(totals)
  const filtered = (list: Donor[]) => applyFilters(list.map(totals), columns, filters)
  const shownAssigned = filtered(assigned)
  const shownUnassigned = filtered(unassigned)
  const shown = [...shownAssigned, ...shownUnassigned].map((r) => r.d)
  const table = (rows: ReturnType<typeof totals>[], caption: string, empty: string, first: boolean) => (
    <DataTable
      caption={caption}
      filters={filters}
      onFiltersChange={setFilters}
      filterRows={allRows}
      showActiveFilters={first}
      columns={columns}
      data={rows}
      getRowId={(r) => r.d.id}
      rowClassName={(r) => (isChanged(r.original.d) ? 'bg-amber-50! hover:bg-amber-100!' : recent.includes(r.original.d.id) ? 'bg-cic-tint!' : undefined)}
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
      />
      <section aria-labelledby="assigned-heading">
        <h2 id="assigned-heading" className="sr-only">Assigned donors</h2>
        {table(shownAssigned, 'Assigned donors', filtering ? 'No assigned donors match these filters.' : 'No donors are assigned yet.', true)}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 [&>h2]:mb-0">
          <SectionTitle>Unassigned donors ({filtering ? `${shownUnassigned.length} of ${unassigned.length}` : unassigned.length})</SectionTitle>
          <Button
            variant="outline"
            disabled={!boardMembers.length || !shownUnassigned.some((r) => !isChanged(r.d))}
            onClick={() => suggest(shownUnassigned.map((r) => r.d))}
          >
            <Sparkles aria-hidden /> Suggest assignment
          </Button>
        </div>
        {filtering && <p className="-mt-2 mb-3 text-sm text-muted-foreground">The filters above apply here too.</p>}
        {table(shownUnassigned, 'Unassigned donors', filtering && unassigned.length ? 'No unassigned donors match these filters.' : 'There are no unassigned donors.', false)}
      </section>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-end gap-3 border-t bg-background py-3 pr-20">
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {changed.length ? `${changed.length} unsaved change${changed.length === 1 ? '' : 's'}` : 'No unsaved changes'}
        </span>
        <Button variant="ghost" disabled={!changed.length || saving} onClick={() => setChoices({})}>Discard changes</Button>
        <Button disabled={!changed.length || saving} onClick={() => save(changed)}>
          {saving ? 'Saving…' : `Save${changed.length ? ` (${changed.length})` : ''}`}
        </Button>
      </div>
    </>
  )
}
