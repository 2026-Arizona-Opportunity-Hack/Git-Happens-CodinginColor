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
// member responsibilities: pick a board member in a row, then Update.
export default function AllDonors() {
  const { donors, gifts, boardMembers } = useStore()
  const location = useLocation()
  // Donors just assigned (from the import popup, or out of Unassigned here)
  // stay at the bottom of the list, marked New, until the page is left.
  const [recent, setRecent] = useState<string[]>(() => (location.state as { newIds?: string[] } | null)?.newIds ?? [])
  const [q, setQ] = useState('')

  const load = new Map(boardMembers.map((m) => [m.id, donors.filter((d) => d.ownerId === m.id).length]))
  const match = (d: Donor) => `${d.name} ${d.org ?? ''} ${d.email ?? ''}`.toLowerCase().includes(q.toLowerCase())
  const rank = (d: Donor) => recent.indexOf(d.id)
  const assigned = donors
    .filter((d) => d.ownerId && match(d))
    .sort((a, b) => (rank(a) === -1 && rank(b) === -1 ? a.name.localeCompare(b.name) : rank(a) === -1 ? -1 : rank(b) === -1 ? 1 : rank(a) - rank(b)))
  const unassigned = donors.filter((d) => !d.ownerId && match(d)).sort((a, b) => a.name.localeCompare(b.name))
  const totalUnassigned = donors.filter((d) => !d.ownerId).length

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
          {rows.map((d) => (
            <DonorRow
              key={d.id}
              donor={d}
              isNew={recent.includes(d.id)}
              load={load}
              lifetime={gifts.filter((g) => g.donorId === d.id).reduce((s, g) => s + g.amount, 0)}
              lastGift={gifts.filter((g) => g.donorId === d.id).map((g) => g.date).sort().at(-1)}
              onAssigned={() => setRecent((r) => (r.includes(d.id) ? r : [...r, d.id]))}
            />
          ))}
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
        description={`Every donor and the board member responsible for them: ${donors.length} donors, ${totalUnassigned} unassigned. Choose a board member in a row, then click Update.`}
      />
      <Input className="mb-4 max-w-sm" placeholder="Search name, org or email" aria-label="Search all donors" value={q} onChange={(e) => setQ(e.target.value)} />

      <section aria-labelledby="assigned-heading">
        <h2 id="assigned-heading" className="sr-only">Assigned donors</h2>
        {table(assigned, q ? 'No assigned donors match that search.' : 'No donors are assigned yet.')}
      </section>

      <section className="mt-10">
        <SectionTitle>Unassigned donors ({unassigned.length})</SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          New donors from imports that haven't been given a board member. Choose one and click Update to move the donor up to the list above.
        </p>
        {table(unassigned, q ? 'No unassigned donors match that search.' : 'Every donor has a board member.')}
      </section>
    </>
  )
}

function DonorRow({ donor: d, isNew, load, lifetime, lastGift, onAssigned }: {
  donor: Donor; isNew: boolean; load: Map<string, number>; lifetime: number; lastGift?: string; onAssigned: () => void
}) {
  const { boardMembers, reassign, ownerName } = useStore()
  const current = d.ownerId ?? UNASSIGNED
  const [choice, setChoice] = useState(current)
  const [saving, setSaving] = useState(false)
  const label = (id: string) => {
    const m = boardMembers.find((x) => x.id === id)
    return m ? `${m.name} (${load.get(m.id) ?? 0})` : 'Unassigned'
  }
  const items = [{ value: UNASSIGNED, label: 'Unassigned' }, ...boardMembers.map((m) => ({ value: m.id, label: label(m.id) }))]

  const save = async () => {
    setSaving(true)
    const ownerId = choice === UNASSIGNED ? null : choice
    const ok = await reassign(d.id, ownerId)
    setSaving(false)
    if (!ok) return
    if (!d.ownerId && ownerId) onAssigned()
    toast.success(ownerId ? `${d.name} assigned to ${label(ownerId).replace(/ \(\d+\)$/, '')}` : `${d.name} is now unassigned`)
  }

  return (
    <TableRow className={isNew ? 'bg-cic-tint' : 'even:bg-cic-tint/40'}>
      <TableCell>
        <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
        {isNew && <Badge className="ml-2 bg-cic-dark text-white">New</Badge>}
        {d.org && d.org !== d.name && <div className="text-xs text-muted-foreground">{d.org}</div>}
      </TableCell>
      <TableCell className="text-sm">
        <div>{d.email ?? '—'}</div>
        {d.phone && <div className="text-muted-foreground">{d.phone}</div>}
      </TableCell>
      <TableCell>{money(lifetime)}</TableCell>
      <TableCell>{lastGift ? fmtDate(lastGift) : '—'}</TableCell>
      <TableCell className="space-x-1">{d.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</TableCell>
      <TableCell className="min-w-52">
        <Select items={items} value={choice} onValueChange={(v) => setChoice(v as string)}>
          <SelectTrigger aria-label={`Board member for ${d.name} (currently ${ownerName(d)})`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {items.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Button size="sm" disabled={choice === current || saving} onClick={save} aria-label={`Update board member for ${d.name}`}>
          {saving ? 'Saving…' : 'Update'}
        </Button>
      </TableCell>
    </TableRow>
  )
}
