import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store'

// DEVELOPMENT ONLY. Remove this page, its nav entry and route in App.tsx, the
// /api/dev/clear-donors route and DEV_TOOLS in wrangler.jsonc before launch.
export default function DevTools() {
  const { donors, gifts, clearDonors } = useStore()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const clear = async () => {
    setBusy(true)
    const r = await clearDonors()
    setBusy(false)
    if (!r) return
    setConfirm('')
    toast.success(`Cleared ${r.donors} donors, ${r.gifts} gifts, ${r.interactions} contacts, ${r.drafts} drafts and ${r.imports} import records`)
  }

  return (
    <>
      <PageHeader title="Dev tools" description="Development only. This page will be removed before the app goes to Coding in Color." />
      <Card className="max-w-xl border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900"><TriangleAlert aria-hidden className="size-5" /> Clear the donor database</CardTitle>
          <CardDescription>
            Permanently deletes all {donors.length} donors and their {gifts.length} gifts, contact history, drafts and the import history, for every
            board member, so imports can be tested from an empty database. Board members, events and API keys are kept. This can't be undone; to get
            the demo data back, run <code>bun run db:seed:remote</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="confirm-clear" className="mb-1">Type DELETE to confirm</Label>
            <Input id="confirm-clear" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="max-w-48" />
          </div>
          <Button variant="destructive" disabled={confirm !== 'DELETE' || busy} onClick={clear}>
            {busy ? 'Clearing…' : 'Clear donor database'}
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
