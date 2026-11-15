import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, SectionTitle } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SAMPLE_CSV } from '@/data/samples'
import { IMPORT_SOURCES as SOURCES, STALE_IMPORT_DAYS } from '@/data/sources'
import type { Source } from '@/data/types'
import { dedupe, matchDonor, rowsFromCsv, SAME_GIFT_DAYS, splitGifts } from '@/lib/dedupe'
import { daysBetween, fmtDate, money } from '@/lib/logic'
import { latestImport } from '@/lib/reminders'
import { useStore } from '@/store'

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function Import() {
  const { importRows, session, imports, today, boardMembers, donors, gifts } = useStore()
  const [csv, setCsv] = useState<Partial<Record<Source, string>>>({})
  const [files, setFiles] = useState<Partial<Record<Source, string>>>({})
  const who = (id: string) => boardMembers.find((m) => m.id === id)?.name ?? 'a former board member'
  const clear = () => { setCsv({}); setFiles({}) }

  if (session.role !== 'admin') return <p>Only CIC admins can import donor data.</p>

  const rows = Object.entries(csv).flatMap(([src, text]) => rowsFromCsv(text!, src as Source))
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

  return (
    <>
      <PageHeader
        title="Import donors"
        description="Load each export, review what merges, then commit. New donors are assigned round-robin to the board member with the fewest."
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
        <section className="mt-8">
          <SectionTitle>Preview</SectionTitle>
          <p className="mb-4 text-sm">
            <strong>{rows.length}</strong> rows → <strong>{clusters.length}</strong> unique donors.{' '}
            <strong>{dupes.length}</strong> merged across sources,{' '}
            <strong>{plan.filter((p) => p.match).length}</strong> already in the database.{' '}
            <strong>{newGifts}</strong> gifts to record; <strong>{dupGifts}</strong> skipped as duplicates
            (same donor and amount, dates within {SAME_GIFT_DAYS} days).
          </p>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-cic-dark hover:bg-cic-dark">
                  {['Donor', 'Email', 'Phone', 'Sources', 'Rows', 'Matched on', 'Gifts'].map((h) => <TableHead key={h} className="text-white">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.map(({ cluster: c, match, keep, skipped }, i) => (
                  <TableRow key={i} className={c.rows.length > 1 ? 'bg-cic-tint' : ''}>
                    <TableCell className="font-medium">
                      {c.name}
                      {match && <div className="text-xs font-normal text-muted-foreground">Existing donor: {match.name}</div>}
                    </TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell className="space-x-1">{c.sources.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</TableCell>
                    <TableCell>{c.rows.length}</TableCell>
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
          </Card>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={async () => {
                const r = await importRows(rows, files)
                if (!r) return
                toast.success(`${r.created} new donors, ${r.merged} merged into existing records. ${r.gifts} gifts recorded, ${r.skippedGifts} duplicates skipped`)
                clear()
              }}
            >
              Commit import
            </Button>
            <Button variant="ghost" onClick={clear}>Clear</Button>
          </div>
        </section>
      )}

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
