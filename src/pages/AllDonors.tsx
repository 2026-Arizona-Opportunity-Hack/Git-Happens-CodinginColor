import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, SectionTitle } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Donor } from '@/data/types'
import { fmtDate, money, UNASSIGNED } from '@/lib/logic'
import { useStore } from '@/store'

// Every donor and who looks after them. This is where an admin manages board
// member responsibilities: pick a board member in a row, then Update (one row)
// or Update all (every changed row). Nothing is saved until then.
export default function AllDonors() {
  const { donors, gifts, boardMembers, assignOwners } = useStore()
  const location = useLocation()
  // From the New Donors popup: {donorId: suggested board member}, not saved yet.
  const suggested = (location.state as { suggested?: Record<string, string> } | null)?.suggested ?? {}
  // Donors from that popup, plus any moved out of Unassigned here, stay at the
  // bottom of the main list, marked New, until the page is left.
  const [recent, setRecent] = useState<string[]>(() => Object.keys(suggested))
  // Unsaved dropdown choices, by donor. A row is "changed" when its choice
  // differs from what D1 holds.
  const [choices, setChoices] = useState<Record<string, string>>(() => ({ ...suggested }))
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')

  const current = (d: Donor) => d.ownerId ?? UNASSIGNED
  const choice = (d: Donor) => choices[d.id] ?? current(d)
  const changed = donors.filter((d) => choice(d) !== current(d))
  const load = new Map(boardMembers.map((m) => [m.id, donors.filter((d) => d.ownerId === m.id).length]))
  const name = (id: string) => boardMembers.find((m) => m.id === id)?.name ?? 'Unassigned'

  const match = (d: Donor) => `${d.name} ${d.org ?? ''} ${d.email ?? ''}`.toLowerCase().includes(q.toLowerCase())
  const rank = (d: Donor) => recent.indexOf(d.id)
  const inMain = (d: Donor) => !!d.ownerId || recent.includes(d.id)
  const assigned = donors
    .filter((d) => inMain(d) && match(d))
    .sort((a, b) => (rank(a) === -1 && rank(b) === -1 ? a.name.localeCompare(b.name) : rank(a) === -1 ? -1 : rank(b) === -1 ? 1 : rank(a) - rank(b)))
  const unassigned = donors.filter((d) => !inMain(d) && match(d)).sort((a, b) => a.name.localeCompare(b.name))
  const totalUnassigned = donors.filter((d) => !d.ownerId).length

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

  const table = (rows: Donor[], empty: string) => (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-cic-dark hover:bg-cic-dark">
            {['Donor', 'Contact', 'Lifetime', 'Last gift', 'Sources', 'Board member', ''].map((h, i) => (
              <TableHead key={i} className="text-white">{h || <span className="sr-only">Save</span>}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => {
            const gs = gifts.filter((g) => g.donorId === d.id)
            const items = [{ value: UNASSIGNED, label: 'Unassigned' }, ...boardMembers.map((m) => ({ value: m.id, label: `${m.name} (${load.get(m.id) ?? 0})` }))]
            const isNew = recent.includes(d.id)
            const pending = !d.ownerId && choice(d) !== UNASSIGNED
            return (
              <TableRow key={d.id} className={isNew ? 'bg-cic-tint' : 'even:bg-cic-tint/40'}>
                <TableCell>
                  <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                  {isNew && <Badge className="ml-2 bg-cic-dark text-white">New</Badge>}
                  {d.org && d.org !== d.name && <div className="text-xs text-muted-foreground">{d.org}</div>}
                  {pending && <div className="text-xs text-amber-900">Suggested, not saved yet</div>}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{d.email ?? '—'}</div>
                  {d.phone && <div className="text-muted-foreground">{d.phone}</div>}
                </TableCell>
                <TableCell>{money(gs.reduce((s, g) => s + g.amount, 0))}</TableCell>
                <TableCell>{(() => { const last = gs.map((g) => g.date).sort().at(-1); return last ? fmtDate(last) : '—' })()}</TableCell>
                <TableCell className="space-x-1">{d.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</TableCell>
                <TableCell className="min-w-52">
                  <Select items={items} value={choice(d)} onValueChange={(v) => setChoices((c) => ({ ...c, [d.id]: v as string }))}>
                    <SelectTrigger aria-label={`Board member for ${d.name}`} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {items.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="sm" disabled={choice(d) === current(d) || saving.has(d.id)} onClick={() => save([d])} aria-label={`Update board member for ${d.name}`}>
                    {saving.has(d.id) ? 'Saving…' : 'Update'}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">{empty}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  )

  return (
    <>
      <PageHeader
        title="All Donors"
        description={`Every donor and the board member responsible for them: ${donors.length} donors, ${totalUnassigned} unassigned. Choose a board member, then click Update for one row or Update all at the bottom.`}
      />
      <Input className="mb-4 max-w-sm" placeholder="Search name, org or email" aria-label="Search all donors" value={q} onChange={(e) => setQ(e.target.value)} />

      <section aria-labelledby="assigned-heading">
        <h2 id="assigned-heading" className="sr-only">Assigned donors</h2>
        {table(assigned, q ? 'No assigned donors match that search.' : 'No donors are assigned yet.')}
      </section>

      <section className="mt-10">
        <SectionTitle>Unassigned donors ({unassigned.length})</SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          Donors without a board member. Choose one and click Update to move the donor up to the list above.
        </p>
        {table(unassigned, q ? 'No unassigned donors match that search.' : 'Every donor has a board member.')}
      </section>

      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t bg-background py-3">
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
