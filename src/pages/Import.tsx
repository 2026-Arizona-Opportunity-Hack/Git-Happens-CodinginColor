import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoveRight } from 'lucide-react'
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
import { autoMapping, CUSTOM, csvHeaders, DB_FIELDS, dedupe, matchDonor, NEW_COLUMN, rowsFromCsv, SAME_GIFT_DAYS, SKIP, splitGifts, targetLabel, type ColumnMapping } from '@/lib/dedupe'
import { daysBetween, fmtDate, money, suggestOwners } from '@/lib/logic'
import { latestImport } from '@/lib/reminders'
import { useStore } from '@/store'

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const label = (src: Source) => SOURCES.find((s) => s.key === src)?.label ?? src

// Upload CSVs -> staging popup (columns found + what merges) -> save ->
// New Donors popup -> assign the chosen ones on All Donors.
export default function Import() {
  const { importRows, imports, today, boardMembers, donors, gifts } = useStore()
  const navigate = useNavigate()
  const [csv, setCsv] = useState<Partial<Record<Source, string>>>({})
  const [files, setFiles] = useState<Partial<Record<Source, string>>>({})
  // Column choices made in staging, per file; unset files use autoMapping.
  const [mappings, setMappings] = useState<Partial<Record<Source, ColumnMapping>>>({})
  const [staging, setStaging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ id: string; name: string }[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const who = (id: string) => boardMembers.find((m) => m.id === id)?.name ?? 'a former board member'
  const clear = () => { setCsv({}); setFiles({}); setMappings({}) }
  // Custom fields earlier imports created; offered as targets and auto-matched by name.
  const customFields = [...new Set(donors.flatMap((d) => Object.keys(d.extra ?? {})))].sort()
  const autoFor = (src: Source) => autoMapping(csvHeaders(csv[src]!), customFields)
  const mappingFor = (src: Source) => mappings[src] ?? autoFor(src)
  const setTarget = (src: Source, header: string, target: string) =>
    setMappings((m) => ({ ...m, [src]: { ...mappingFor(src), [header]: target } }))

  const loaded = Object.entries(csv) as [Source, string][]
  const rows = loaded.flatMap(([src, text]) => rowsFromCsv(text, src, mappingFor(src)))
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
  const newTotal = plan.reduce((n, p) => n + p.keep.reduce((t, g) => t + g.amount, 0), 0)
  const dupGifts = plan.reduce((n, p) => n + p.skipped.length, 0)
  // Rows whose gift would be dropped: say why, so money never disappears silently.
  const issues = {
    'no-date': rows.filter((r) => r.giftIssue === 'no-date'),
    'bad-date': rows.filter((r) => r.giftIssue === 'bad-date'),
    'bad-amount': rows.filter((r) => r.giftIssue === 'bad-amount'),
  }
  // A file with no name column yields no donors at all; say so instead of saving nothing.
  const nameless = loaded.filter(([src]) => !Object.values(mappingFor(src)).some((t) => ['name', 'firstName', 'lastName'].includes(t))).map(([src]) => src)

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

  // Selected donors open on All Donors with a suggested board member (fewest
  // donors, spread as we go) filled in but not saved: the admin confirms with
  // Update or Update all. Unselected ones stay under Unassigned.
  const assign = () => {
    const ids = created!.filter((d) => picked.has(d.id)).map((d) => d.id)
    const suggested = ids.length ? Object.fromEntries(suggestOwners(boardMembers, donors, ids)) : {}
    setCreated(null)
    navigate('/all-donors', { state: { suggested } })
  }

  return (
    <>
      <PageHeader
        title="Update Donors"
        description="Upload each export, review it in the staging step, then save. New donors are assigned on All Donors."
        actions={<Button variant="outline" onClick={() => { setCsv(SAMPLE_CSV); setMappings({}); setFiles({ spreadsheet: 'sample-spreadsheet.csv', zeffy: 'sample-zeffy.csv', benevity: 'sample-benevity.csv' }) }}>Load sample files</Button>}
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
                    setMappings((m) => { const next = { ...m }; delete next[s.key]; return next }) // new file: re-detect its columns
                  }}
                />
                {csv[s.key] && <p className="mt-2 text-sm text-cic-dark">{rowsFromCsv(csv[s.key]!, s.key, mappingFor(s.key)).length} rows loaded</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Shown even at 0 rows: a file whose name column wasn't recognized needs mapping first. */}
      {loaded.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => setStaging(true)}>Review and map columns</Button>
          <Button variant="ghost" onClick={clear}>Clear</Button>
          <span className="text-sm text-muted-foreground">Nothing is saved until you confirm in the review step.</span>
        </div>
      )}

      {/* Staging: what the files contain and what will happen, before anything is saved. */}
      <Dialog open={staging} onOpenChange={(o) => !saving && setStaging(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Your import is ready to save</DialogTitle>
            <DialogDescription>
              Check how each column maps to the donor database. Unmapped columns aren't saved unless you pick a field for them or create a new column.
            </DialogDescription>
          </DialogHeader>

          <div role="status" className="rounded-md bg-cic-tint p-3 text-cic-dark">
            <strong>{newGifts} gift{newGifts === 1 ? '' : 's'} totaling {money(newTotal)}</strong> will be recorded
            {dupGifts > 0 && <> ({dupGifts} skipped: already recorded for that donor, same amount within {SAME_GIFT_DAYS} days)</>}.
            {' '}{plan.filter((p) => !p.match).length} new donor{plan.filter((p) => !p.match).length === 1 ? '' : 's'}, {plan.filter((p) => p.match).length} already in the database.
          </div>
          {(['no-date', 'bad-date', 'bad-amount'] as const).filter((k) => issues[k].length).map((k) => (
            <p key={k} role="alert" className="rounded-md bg-amber-100 p-3 text-amber-950">
              <strong>{issues[k].length} gift{issues[k].length === 1 ? '' : 's'} won't be saved: </strong>
              {k === 'no-date' && 'they have an amount but no date. Map the file\'s date column to Gift date below.'}
              {k === 'bad-date' && 'their date couldn\'t be read (use a format like 2026-11-14, 11/14/2026 or Nov 14, 2026).'}
              {k === 'bad-amount' && 'their amount couldn\'t be read as a positive number.'}
              {' '}For example: {issues[k].slice(0, 3).map((r) => r.name).join(', ')}.
            </p>
          ))}

          {loaded.map(([src]) => {
            const mapping = mappingFor(src)
            const auto = autoFor(src)
            const headers = Object.keys(mapping)
            const mapped = headers.filter((h) => auto[h] !== SKIP)
            const unmapped = headers.filter((h) => auto[h] === SKIP)
            return (
              <section key={src} aria-label={`${label(src)} columns`} className="space-y-4">
                <h3 className="font-semibold text-cic-dark">{label(src)} <span className="font-normal text-muted-foreground">· {files[src]}</span></h3>
                {nameless.includes(src) && (
                  <p role="alert" className="rounded-md bg-red-100 p-3 text-red-900">Map a column to Name (or First name / Last name). Without one, no donors can be read from this file.</p>
                )}
                <ColumnTable
                  title="Mapped fields" count={mapped.length} note={`${mapped.length} column${mapped.length === 1 ? '' : 's'} matched to the donor database`}
                  headers={mapped} mapping={mapping} customFields={customFields} onChange={(h, t) => setTarget(src, h, t)} tone="mapped"
                />
                {unmapped.length > 0 && (
                  <ColumnTable
                    title="Unmapped columns" count={unmapped.length} note="Not in the donor database. Choose a field, create a new column, or leave as Do not save."
                    headers={unmapped} mapping={mapping} customFields={customFields} onChange={(h, t) => setTarget(src, h, t)} tone="unmapped"
                  />
                )}
              </section>
            )
          })}

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-semibold text-cic-dark">
              Preview donors: {rows.length} rows → {clusters.length} donors, {dupes.length} merged across files
            </summary>
            <div className="mt-3">
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
            </div>
          </details>

          <DialogFooter>
            <Button variant="ghost" disabled={saving} onClick={() => setStaging(false)}>Back</Button>
            <Button disabled={saving || rows.length === 0} onClick={save}>{saving ? 'Saving…' : 'Save to database'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* After saving: choose which new donors to assign now. */}
      <Dialog open={created !== null} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Donors ({created?.length ?? 0})</DialogTitle>
            <DialogDescription>
              These donors weren't in the database before. Selected donors open at the bottom of All Donors with a suggested board member (whoever
              has the fewest donors) that you can change, and nothing is assigned until you click Update or Update all. Unselected donors go to the
              Unassigned section.
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

// One block of the staging step: file column -> arrow -> database column.
// A target can only be used by one column in the file; Do not save and
// Create a new column are always available.
function ColumnTable({ title, count, note, headers, mapping, customFields, onChange, tone }: {
  title: string; count: number; note: string; headers: string[]; mapping: ColumnMapping; customFields: string[]
  onChange: (header: string, target: string) => void; tone: 'mapped' | 'unmapped'
}) {
  const id = `cols-${title.replace(/\W/g, '')}-${headers.join('').replace(/\W/g, '').slice(0, 20)}`
  return (
    <div className="rounded-lg bg-muted/60 p-4">
      <div className="flex items-center gap-2">
        <h4 id={id} className="font-semibold">{title}</h4>
        <Badge className={tone === 'mapped' ? 'bg-cic-green text-cic-dark' : 'bg-amber-100 text-amber-900'}>{count}</Badge>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{note}</p>
      <div className="overflow-hidden rounded-md border bg-background">
        <table className="w-full text-sm" aria-labelledby={id}>
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="px-4 py-2 font-medium">Your file column</th>
              <th scope="col" className="px-4 py-2 font-medium">Mapping</th>
              <th scope="col" className="px-4 py-2 font-medium">Database column</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((h) => {
              const taken = new Set(Object.entries(mapping).filter(([other, t]) => other !== h && t !== SKIP && !t.startsWith(NEW_COLUMN)).map(([, t]) => t))
              const value = mapping[h]
              const isNew = value.startsWith(NEW_COLUMN)
              const options = [
                SKIP,
                ...DB_FIELDS.map((f) => f.key as string).filter((k) => !taken.has(k)),
                ...customFields.map((f) => CUSTOM + f).filter((k) => !taken.has(k)),
                isNew ? value : NEW_COLUMN + h, // defaults to the file's header; renamed in the box beside it
              ]
              return (
                <tr key={h} className="border-b last:border-0">
                  <td className="px-4 py-2">{h}</td>
                  <td className="px-4 py-2">
                    <MoveRight aria-hidden className={value === SKIP ? 'text-muted-foreground' : 'text-cic-green'} />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      aria-label={`Database column for ${h}`}
                      className="w-full rounded-md border bg-background px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      value={value}
                      onChange={(e) => onChange(h, e.target.value)}
                    >
                      {options.map((o) => <option key={o} value={o}>{o.startsWith(NEW_COLUMN) ? 'Create a new column…' : targetLabel(o, h)}</option>)}
                    </select>
                    {isNew && (
                      <Input
                        className="mt-2"
                        aria-label={`Name for the new column from ${h}`}
                        placeholder="New column name"
                        maxLength={60}
                        value={value.slice(NEW_COLUMN.length)}
                        onChange={(e) => onChange(h, NEW_COLUMN + e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
