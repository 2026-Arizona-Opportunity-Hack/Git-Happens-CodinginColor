import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, KeyRound } from 'lucide-react'
import { PageHeader, SectionTitle } from '@/components/common'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { fmtDate } from '@/lib/logic'
import { useStore, type ApiKey } from '@/store'

// Admins create and revoke the keys CIC's dashboard uses for /api/v1. A new
// key is shown once; after that only its prefix is known.
export default function Api() {
  const { listApiKeys, createApiKey, revokeApiKey } = useStore()
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [error, setError] = useState(false)
  const [name, setName] = useState('')
  const [created, setCreated] = useState<ApiKey>()
  const [copied, setCopied] = useState(false)

  const refresh = () => listApiKeys().then(setKeys, () => setError(true))
  useEffect(() => {
    listApiKeys().then(setKeys, () => setError(true))
  }, [listApiKeys])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const k = await createApiKey(name)
    if (!k) return
    setCreated(k)
    setCopied(false)
    setName('')
    refresh()
  }

  const revoke = async (k: ApiKey) => {
    if (!confirm(`Revoke "${k.name}"? Anything using it stops working right away.`)) return
    if ((await revokeApiKey(k.id)) !== undefined) refresh()
  }

  const copy = async () => {
    await navigator.clipboard.writeText(created!.key!)
    setCopied(true)
  }

  const example = `curl -H "Authorization: Bearer cic_live_…" "${location.origin}/api/v1/summary?period=2026-Q4"`

  return (
    <>
      <PageHeader
        title="Read API"
        actions={
          // Served by the Worker, not the router, so it's a plain link.
          <a href="/api/docs" target="_blank" rel="noopener" className={buttonVariants({ variant: 'outline' })}>
            <ExternalLink aria-hidden /> API reference<span className="sr-only"> (opens in a new tab)</span>
          </a>
        }
      />

      <section className="mb-8 space-y-3">
        <SectionTitle>Try it</SectionTitle>
        <pre className="overflow-x-auto rounded-md bg-black p-4 text-xs text-white">{example}</pre>
        <p className="text-sm text-muted-foreground">
          <code>period</code> is a year (<code>2026</code>) or a quarter (<code>2026-Q4</code>). Add <code>program</code> or <code>board_member</code> to narrow it.
        </p>
      </section>

      <section className="mb-8">
        <SectionTitle>Create a key</SectionTitle>
        <Card>
          <CardContent className="space-y-4">
            <form onSubmit={create} className="flex flex-wrap items-end gap-2">
              <div className="grow space-y-1">
                <Label htmlFor="key-name">What will use it?</Label>
                <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CIC org dashboard" maxLength={100} required />
              </div>
              <Button type="submit" disabled={!name.trim()}>
                <KeyRound aria-hidden /> Create key
              </Button>
            </form>
            {created?.key && (
              <div role="status" className="space-y-2 rounded-md border border-cic-dark bg-cic-tint p-3">
                <p className="text-sm font-medium">Copy the key for "{created.name}" now. It won't be shown again.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-white px-2 py-1 text-sm break-all">{created.key}</code>
                  <Button size="sm" variant="outline" className="bg-white" onClick={copy}>
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionTitle>Keys</SectionTitle>
        {error ? (
          <p className="text-muted-foreground">Could not load keys.</p>
        ) : !keys ? (
          <p role="status" className="text-muted-foreground">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground">No keys yet.</p>
        ) : (
          <DataTable
            caption="API keys"
            columns={keyColumns(revoke)}
            data={keys}
            getRowId={(k) => k.id}
            rowClassName={(r) => (r.original.revokedAt ? 'text-muted-foreground' : undefined)}
          />
        )}
      </section>
    </>
  )
}

const day = (iso: string) => fmtDate(iso.slice(0, 10))

const keyColumns = (revoke: (k: ApiKey) => void): ColumnDef<ApiKey>[] => [
  { accessorKey: 'name', header: 'Name', meta: { className: 'font-medium' } },
  { id: 'key', header: 'Key', enableSorting: false, cell: ({ row }) => <code>{row.original.prefix}…</code> },
  { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => day(row.original.createdAt) },
  { accessorKey: 'lastUsedAt', header: 'Last used', sortUndefined: 'last', cell: ({ row }) => (row.original.lastUsedAt ? day(row.original.lastUsedAt) : 'Never') },
  {
    id: 'status',
    header: () => <span className="sr-only">Status</span>,
    enableSorting: false,
    meta: { className: 'text-right' },
    cell: ({ row: { original: k } }) =>
      k.revokedAt ? (
        `Revoked ${day(k.revokedAt)}`
      ) : (
        <Button size="sm" variant="outline" onClick={() => revoke(k)}>
          Revoke<span className="sr-only"> {k.name}</span>
        </Button>
      ),
  },
]
