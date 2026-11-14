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
import type { Source } from '@/data/types'
import { dedupe, rowsFromCsv } from '@/lib/dedupe'
import { useStore } from '@/store'

const SOURCES: { key: Source; label: string; hint: string }[] = [
  { key: 'spreadsheet', label: 'Donor spreadsheet', hint: 'Export the Google Sheet as CSV' },
  { key: 'zeffy', label: 'Zeffy export', hint: 'Zeffy → Payments → Export' },
  { key: 'benevity', label: 'Benevity export', hint: 'Benevity Causes Portal → Donations report' },
]

export default function Import() {
  const { importRows, session } = useStore()
  const [csv, setCsv] = useState<Partial<Record<Source, string>>>({})

  if (session.role !== 'admin') return <p>Only CIC admins can import donor data.</p>

  const rows = Object.entries(csv).flatMap(([src, text]) => rowsFromCsv(text!, src as Source))
  const clusters = dedupe(rows)
  const dupes = clusters.filter((c) => c.rows.length > 1)

  return (
    <>
      <PageHeader
        title="Import donors"
        description="Load each export, review what merges, then commit. New donors are assigned round-robin to the board member with the fewest."
        actions={<Button variant="outline" onClick={() => setCsv(SAMPLE_CSV)}>Load sample files</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {SOURCES.map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle>{s.label}</CardTitle>
              <CardDescription>{s.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor={`f-${s.key}`} className="sr-only">{s.label} CSV</Label>
              <Input
                id={`f-${s.key}`}
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const text = await e.target.files?.[0]?.text()
                  if (text) setCsv((c) => ({ ...c, [s.key]: text }))
                }}
              />
              {csv[s.key] && <p className="mt-2 text-sm text-cic-dark">{rowsFromCsv(csv[s.key]!, s.key).length} rows loaded</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Preview</SectionTitle>
          <p className="mb-4 text-sm">
            <strong>{rows.length}</strong> rows → <strong>{clusters.length}</strong> unique donors.{' '}
            <strong>{dupes.length}</strong> merged across sources. Existing donors are matched on commit.
          </p>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-cic-dark hover:bg-cic-dark">
                  {['Donor', 'Email', 'Phone', 'Sources', 'Rows', 'Matched on'].map((h) => <TableHead key={h} className="text-white">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map((c, i) => (
                  <TableRow key={i} className={c.rows.length > 1 ? 'bg-cic-tint' : ''}>
                    <TableCell className="font-medium">{c.name}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={async () => {
                const r = await importRows(rows)
                if (!r) return
                toast.success(`${r.created} new donors, ${r.merged} merged into existing records`)
                setCsv({})
              }}
            >
              Commit import
            </Button>
            <Button variant="ghost" onClick={() => setCsv({})}>Clear</Button>
          </div>
        </section>
      )}
    </>
  )
}
