import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, SectionTitle } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SAMPLE_CSV } from '@/data/samples'
import { IMPORT_SOURCES as SOURCES, STALE_IMPORT_DAYS } from '@/data/sources'
import type { Source } from '@/data/types'
import { csvColumns, dedupe, matchDonor, rowsFromCsv, SAME_GIFT_DAYS, splitGifts } from '@/lib/dedupe'
import { daysBetween, fmtDate, money, suggestOwners } from '@/lib/logic'
import { latestImport } from '@/lib/reminders'
import { useStore } from '@/store'

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const label = (src: Source) => SOURCES.find((s) => s.key === src)?.label ?? src

// Upload CSVs -> staging popup (columns found + what merges) -> save ->
// New Donors popup -> assign the chosen ones on All Donors.
export default function Import() {
  const { importRows, assignOwners, imports, today, boardMembers, donors, gifts } = useStore()
  const navigate = useNavigate()
  const [csv, setCsv] = useState<Partial<Record<Source, string>>>({})
  const [files, setFiles] = useState<Partial<Record<Source, string>>>({})
  const [staging, setStaging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ id: string; name: string }[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const who = (id: string) => boardMembers.find((m) => m.id === id)?.name ?? 'a former board member'
  const clear = () => { setCsv({}); setFiles({}) }

  const loaded = Object.entries(csv) as [Source, string][]
  const rows = loaded.flatMap(([src, text]) => rowsFromCsv(text, src))
  const clusters = dedupe(rows)
  const dupes = clusters.filter((c) => c.rows.length > 1)
  // Same matching the server runs on commit (admins have every donor and gift
  // loaded), so the preview shows exactly which gifts will be skipped.
  const known = new Map<string, { amount: number; date: string }[]>()
  const plan = clusters.map((c, i) => {
    const match = matchDonor(c, donors)
    const key = match?.id ?? `new-${i}`
    if (!known.has(key)) known.set(key, gifts.filter((g) => g.donorId === match?.id))
    const split = splitGifts(c.rows, known.get(key)!)
    known.get(key)!.push(...split.keep)
    return { cluster: c, match, ...split }
  })
  const newGifts = plan.reduce((n, p) => n + p.keep.length, 0)
  const dupGifts = plan.reduce((n, p) => n + p.skipped.length, 0)
  const columns = loaded.map(([src, text]) => ({ src, cols: csvColumns(text) }))
  const notInDb = [...new Set(columns.flatMap((c) => c.cols.filter((x) => !x.field).map((x) => x.column)))]

  const save = async () => {
    setSaving(true)
    const r = await importRows(rows, files)
    setSaving(false)
    if (!r) return
    setStaging(false)
    clear()
    toast.success(`${r.created} new donors, ${r.merged} merged into existing records. ${r.gifts} gifts recorded, ${r.skippedGifts} duplicates skipped`)
    if (r.createdDonors.length) {
      setCreated(r.createdDonors)
      setPicked(new Set(r.createdDonors.map((d) => d.id)))
    }
  }

  // Selected donors get the suggested board member (fewest donors, spread as
  // we go); the rest stay unassigned. Both show up on All Donors.
  const assign = async () => {
    const ids = created!.filter((d) => picked.has(d.id)).map((d) => d.id)
    if (ids.length) {
      const suggested = suggestOwners(boardMembers, donors, ids)
      const ok = await assignOwners(ids.map((donorId) => ({ donorId, ownerId: suggested.get(donorId)! })))
      if (!ok) return
    }
    setCreated(null)
    navigate('/all-donors', { state: { newIds: ids } })
  }

  return (
    <>
      <PageHeader
        title="Update Donors"
        description="Upload each export, review it in the staging step, then save. New donors are assigned on All Donors."
        actions={<Button variant="outline" onClick={() => { setCsv(SAMPLE_CSV); setFiles({ spreadsheet: 'sample-spreadsheet.csv', zeffy: 'sample-zeffy.csv', benevity: 'sample-benevity.csv' }) }}>Load sample files</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {SOURCES.map((s) => {
          const last = latestImport(imports, s.key)
          const age = last && daysBetween(last.importedAt.slice(0, 10), today)
          const stale = !last || age! >= STALE_IMPORT_DAYS
          return (
            <Card key={s.key}>
              <CardHeader>
                <CardTitle>{s.label}</CardTitle>
                <CardDescription>{s.hint}</CardDescription>
                <p className="text-sm">
                  <span className="text-muted-foreground">Last updated: </span>
                  {last ? <time dateTime={last.importedAt}>{fmtDate(last.importedAt.slice(0, 10))}</time> : 'never'}
                  {last && <span className="text-muted-foreground"> ({age === 0 ? 'today' : `${age}d ago`})</span>}
                  {stale && <Badge className="ml-2 bg-amber-100 text-amber-900">{last ? 'stale' : 'not imported'}</Badge>}
                </p>
              </CardHeader>
              <CardContent>
                <Label htmlFor={`f-${s.key}`} className="sr-only">{s.label} CSV</Label>
                <Input
                  id={`f-${s.key}`}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    const text = await file?.text()
                    if (!file || !text) return
                    setCsv((c) => ({ ...c, [s.key]: text }))
                    setFiles((f) => ({ ...f, [s.key]: file.name }))
                  }}
                />
                {csv[s.key] && <p className="mt-2 text-sm text-cic-dark">{rowsFromCsv(csv[s.key]!, s.key).length} rows loaded</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {rows.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => setStaging(true)}>Review {rows.length} rows</Button>
          <Button variant="ghost" onClick={clear}>Clear</Button>
          <span className="text-sm text-muted-foreground">Nothing is saved until you confirm in the review step.</span>
        </div>
      )}

      {/* Staging: what the files contain and what will happen, before anything is saved. */}
      <Dialog open={staging} onOpenChange={(o) => !saving && setStaging(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Review before saving</DialogTitle>
            <DialogDescription>
              {rows.length} rows → {clusters.length} unique donors: {plan.filter((p) => !p.match).length} new,{' '}
              {plan.filter((p) => p.match).length} already in the database, {dupes.length} merged across files.{' '}
              {newGifts} gifts to record; {dupGifts} skipped as duplicates (same donor and amount within {SAME_GIFT_DAYS} days).
            </DialogDescription>
          </DialogHeader>

          <section aria-labelledby="cols-heading">
            <h3 id="cols-heading" className="mb-2 font-semibold text-cic-dark">Columns found</h3>
            {notInDb.length > 0 ? (
              <p role="note" className="mb-3 rounded-md bg-amber-100 p-3 text-amber-950">
                <strong>{notInDb.length} column{notInDb.length === 1 ? ' is' : 's are'} not in the donor database</strong> and won't be saved:{' '}
                {notInDb.join(', ')}.
              </p>
            ) : (
              <p className="mb-3 rounded-md bg-cic-tint p-3 text-cic-dark">Every column matches a field in the donor database.</p>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              {columns.map(({ src, cols }) => (
                <div key={src} className="rounded-md border p-3">
                  <div className="mb-2 font-medium">{label(src)} <span className="font-normal text-muted-foreground">· {files[src]}</span></div>
                  <ul className="space-y-1">
                    {cols.map((c) => (
                      <li key={c.column} className="flex items-center justify-between gap-2">
                        <span>{c.column}</span>
                        {c.field
                          ? <Badge variant="outline">→ {c.field}</Badge>
                          : <Badge className="bg-amber-100 text-amber-900">Not in database</Badge>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="donors-heading">
            <h3 id="donors-heading" className="mb-2 font-semibold text-cic-dark">Donors</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-cic-dark hover:bg-cic-dark">
                  {['Donor', 'Email', 'Phone', 'Sources', 'Matched on', 'Gifts'].map((h) => <TableHead key={h} className="text-white">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.map(({ cluster: c, match, keep, skipped }, i) => (
                  <TableRow key={i} className={c.rows.length > 1 ? 'bg-cic-tint' : ''}>
                    <TableCell className="font-medium">
                      {c.name}
                      <div className="text-xs font-normal text-muted-foreground">{match ? `Existing donor: ${match.name}` : 'New donor'}</div>
                    </TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell className="space-x-1">{c.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</TableCell>
                    <TableCell>
                      {c.matchedOn.length === 0 ? '—' : c.matchedOn.map((m) => (
                        <Badge key={m} className={m === 'name' ? 'bg-amber-100 text-amber-900' : 'bg-cic-dark text-white'}>
                          {m === 'name' ? 'name only: check' : m}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      {keep.length} new
                      {skipped.length > 0 && (
                        <div className="text-xs text-amber-900">
                          {skipped.length} already recorded: {skipped.map((g) => `${money(g.amount)} ${fmtDate(g.date)} (${g.source})`).join(', ')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <DialogFooter>
            <Button variant="ghost" disabled={saving} onClick={() => setStaging(false)}>Back</Button>
            <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save to database'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* After saving: choose which new donors to assign now. */}
      <Dialog open={created !== null} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Donors ({created?.length ?? 0})</DialogTitle>
            <DialogDescription>
              These donors weren't in the database before. Selected donors get the board member with the fewest donors, which you can change on
              All Donors. Unselected donors go to the Unassigned section there.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPicked(new Set(created!.map((d) => d.id)))}>Select all</Button>
            <Button size="sm" variant="outline" onClick={() => setPicked(new Set())}>Select none</Button>
            <span className="ml-auto self-center text-muted-foreground">{picked.size} selected</span>
          </div>
          <ul className="divide-y rounded-md border">
            {created?.map((d) => (
              <li key={d.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
                  <input
                    type="checkbox"
                    className="size-4 accent-cic-dark"
                    checked={picked.has(d.id)}
                    onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(d.id); else n.delete(d.id); return n })}
                  />
                  {d.name}
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={assign}>{picked.size ? `Assign ${picked.size} donor${picked.size === 1 ? '' : 's'}` : 'Continue to All Donors'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="mt-8">
        <SectionTitle>Import history</SectionTitle>
        <p className="mb-4 text-sm text-muted-foreground">
          Re-import each export at least every {STALE_IMPORT_DAYS} days; older ones show up on the Notifications page.
        </p>
        {imports.length === 0 ? (
          <p className="text-sm">Nothing imported yet.</p>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-cic-dark hover:bg-cic-dark">
                  {['When', 'Source', 'File', 'Rows', 'By'].map((h) => <TableHead key={h} className="text-white">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.slice(0, 15).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell><time dateTime={i.importedAt}>{fmtWhen(i.importedAt)}</time></TableCell>
                    <TableCell><Badge variant="outline">{i.source}</Badge></TableCell>
                    <TableCell>{i.fileName ?? '—'}</TableCell>
                    <TableCell>{i.rowCount}</TableCell>
                    <TableCell>{who(i.importedBy)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </>
  )
}
