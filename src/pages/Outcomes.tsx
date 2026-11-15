import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Program, ProgramOutcome } from '@/data/types'
import { fmtDate } from '@/lib/logic'
import { useStore } from '@/store'

const PROGRAMS: Program[] = ['K12', 'AI Academy', 'Summer Camp', 'Day of Compute', 'General']

// Admins write what each program achieved. Funder packets and quarterly-update
// drafts quote it for the programs a donor funded.
export default function Outcomes() {
  const { outcomes, sample } = useStore()
  return (
    <>
      <PageHeader
        title="Program outcomes"
        description="What each program achieved. Funder packets and quarterly updates quote these for the programs a donor funded."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {PROGRAMS.map((p) => {
          const o = outcomes.find((x) => x.program === p)
          // Remount when the saved copy changes, so the form shows what's stored.
          return <OutcomeCard key={`${p}-${sample}-${o?.updatedAt}-${o?.summary}`} program={p} outcome={o} />
        })}
      </div>
    </>
  )
}

function OutcomeCard({ program, outcome }: { program: Program; outcome?: ProgramOutcome }) {
  const { saveOutcome } = useStore()
  const [students, setStudents] = useState(outcome?.studentsServed?.toString() ?? '')
  const [summary, setSummary] = useState(outcome?.summary ?? '')
  const [saving, setSaving] = useState(false)
  const id = program.replace(/\W+/g, '-').toLowerCase()

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const ok = await saveOutcome({ program, studentsServed: students === '' ? null : Number(students), summary })
    setSaving(false)
    if (ok !== undefined) toast.success(`${program} outcomes saved.`)
  }

  return (
    <Card>
      <CardHeader><CardTitle><h2>{program}</h2></CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${id}-students`}>Students served</Label>
            <Input id={`${id}-students`} type="number" inputMode="numeric" min={0} max={1000000} step={1} className="max-w-40"
              value={students} onChange={(e) => setStudents(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-summary`}>Outcomes</Label>
            <Textarea id={`${id}-summary`} rows={4} maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder="Completion, learning gain, what students built" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{outcome?.updatedAt ? `Updated ${fmtDate(outcome.updatedAt.slice(0, 10))}` : ''}</span>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
