import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, Paged, SectionTitle } from '@/components/common'
import { SendDraft } from '@/components/SendDraft'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { DraftKind } from '@/data/types'
import { DRAFT_SUBJECT, draftBody } from '@/lib/drafts'
import { useStore } from '@/store'
import { calendarLink, daysBetween, fmtDate, quarterlyTouchDue, retentionStatus, yearOf } from '@/lib/logic'
import { cn, fmtPhone } from '@/lib/utils'

// The board member's work queue. The AI drafts and the system reminds; a
// human sends. Template emails offers the plain templates instead.
export default function FollowUps() {
  const { donors, gifts, drafts, today, createDraft, updateDraft } = useStore()
  // The AI writes the draft, which takes a few seconds.
  const draft = async (donorId: string, kind: DraftKind) => {
    const t = toast.loading('Writing the draft…')
    if (await createDraft(donorId, kind)) toast.success('Draft added to Drafts awaiting approval', { id: t })
    else toast.dismiss(t)
  }
  const ids = new Set(donors.map((d) => d.id))
  const name = (id: string) => donors.find((d) => d.id === id)?.name

  const steps = donors.filter((d) => d.nextStep).sort((a, b) => a.nextStep!.due.localeCompare(b.nextStep!.due))
  const touchDue = donors.filter((d) => quarterlyTouchDue(d, today))
  const lapsed = donors.filter((d) => retentionStatus(gifts.filter((g) => g.donorId === d.id), yearOf(today)) === 'lapsed')
  const pending = drafts.filter((d) => d.status === 'pending' && ids.has(d.donorId))
  const hasPending = (donorId: string) => pending.some((p) => p.donorId === donorId)
  const overdue = steps.filter((d) => d.nextStep!.due < today).length

  // The dashboard's numbers link to #next-steps and #lapsed; the router doesn't
  // scroll to a hash itself, so move there and put focus on the section.
  const { hash } = useLocation()
  useEffect(() => {
    const el = hash && document.getElementById(hash.slice(1))
    if (!el) return
    el.scrollIntoView({ block: 'start' })
    el.focus({ preventScroll: true })
  }, [hash])

  return (
    <>
      <PageHeader title="Follow-ups" />

      {pending.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Drafts awaiting approval ({pending.length})</SectionTitle>
          <Paged items={pending} size={6} label="Drafts" className="mt-4 border-t-0 pt-0">{(page) => (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {page.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <CardTitle>{name(d.donorId)}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    {d.kind.replace('-', ' ')} · {d.channel}
                    {d.ai && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">Drafted by AI: check before sending</Badge>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea aria-label={`Draft to ${name(d.donorId)}`} rows={7} value={d.body} onChange={(e) => updateDraft(d.id, e.target.value)} />
                </CardContent>
                <CardFooter>
                  <SendDraft draft={d} donor={donors.find((x) => x.id === d.donorId)!} />
                </CardFooter>
              </Card>
            ))}
          </div>
          )}</Paged>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section id="next-steps" tabIndex={-1} className="scroll-mt-24 md:scroll-mt-4 outline-none">
          <SectionTitle>Next steps{overdue > 0 && <span className="text-red-700"> ({overdue} overdue)</span>}</SectionTitle>
          <Card>
            <CardContent>
              <Paged items={steps} label="Next steps">{(page) => (
              <ul className="divide-y">
                {page.map((d) => {
                  const late = daysBetween(d.nextStep!.due, today)
                  return (
                    <li key={d.id} className={cn('flex items-center justify-between gap-3 py-3', late > 0 && '-mx-(--card-spacing) bg-red-50 px-(--card-spacing)')}>
                      <div>
                        <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                        <div className="text-sm">{d.nextStep!.text}</div>
                        <a className="text-xs text-cic-dark underline" href={calendarLink(d.nextStep!, d, location.origin)} target="_blank" rel="noreferrer">
                          Add to Google Calendar<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </div>
                      <Badge className={late > 0 ? 'bg-red-100 text-red-900' : 'bg-cic-tint text-cic-dark'}>
                        {late > 0 ? `${late}d overdue` : `due ${fmtDate(d.nextStep!.due)}`}
                      </Badge>
                    </li>
                  )
                })}
                {steps.length === 0 && <li className="py-3 text-muted-foreground">No next steps set.</li>}
              </ul>
              )}</Paged>
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionTitle>Quarterly update due ({touchDue.length})</SectionTitle>
          <Card>
            <CardContent>
              <Paged items={touchDue} label="Quarterly update due">{(page) => (
              <ul className="divide-y">
                {page.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                      <div className="text-sm text-muted-foreground">
                        {d.lastTouchAt ? `Last contact ${fmtDate(d.lastTouchAt)}` : 'Never contacted'}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={hasPending(d.id)} onClick={() => draft(d.id, 'quarterly-update')}>
                      {hasPending(d.id) ? 'Drafted' : 'Draft update'}
                    </Button>
                  </li>
                ))}
              </ul>
              )}</Paged>
            </CardContent>
          </Card>

          {lapsed.length > 0 && (
            <>
              <h2 id="lapsed" tabIndex={-1} className="mt-8 mb-3 scroll-mt-24 md:scroll-mt-4 text-lg text-red-700 outline-none">Lapsed donors ({lapsed.length}) — call before year end</h2>
              <Card>
                <CardContent>
                  <Paged items={lapsed} label="Lapsed donors">{(page) => (
                  <ul className="divide-y">
                    {page.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                        <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                        <Button size="sm" variant="outline" disabled={hasPending(d.id)} onClick={() => draft(d.id, 'lapsed-nudge')}>
                          {hasPending(d.id) ? 'Drafted' : 'Draft nudge'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  )}</Paged>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </div>

      <TemplateEmails />
    </>
  )
}

// The standard messages, filled in for one donor. "Use this template" adds it
// to Drafts awaiting approval as written, without the AI.
const TEMPLATES: { kind: DraftKind; label: string }[] = [
  { kind: 'thank-you', label: 'Thank-you' },
  { kind: 'quarterly-update', label: 'Quarterly update' },
  { kind: 'lapsed-nudge', label: 'Lapsed nudge' },
  { kind: 'follow-up', label: 'Follow-up' },
]

function TemplateEmails() {
  const { donors, gifts, events, boardMembers, session, today, createDraft } = useStore()
  const sorted = [...donors].sort((a, b) => a.name.localeCompare(b.name))
  const [donorId, setDonorId] = useState(sorted[0]?.id ?? '')
  const [kind, setKind] = useState<DraftKind>('thank-you')
  const [saving, setSaving] = useState(false)
  const donor = donors.find((d) => d.id === donorId)
  if (!donor) return null

  const owner = boardMembers.find((m) => m.id === donor.ownerId) ?? boardMembers.find((m) => m.id === session.memberId) ?? { id: '', name: 'Coding in Color', email: '' }
  const channel = donor.email || !donor.phone ? 'email' : 'text'
  const body = draftBody(kind, donor, gifts.filter((g) => g.donorId === donor.id), owner, events.find((e) => e.date >= today))
  const use = async () => {
    setSaving(true)
    const ok = await createDraft(donor.id, kind, channel, body, true)
    setSaving(false)
    if (ok) toast.success(`Template added to Drafts awaiting approval for ${donor.name}`)
  }

  return (
    <section className="mt-10" aria-labelledby="templates-heading">
      <SectionTitle><span id="templates-heading">Template emails</span></SectionTitle>
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,16rem)_1fr]">
          <div className="space-y-3">
            <div>
              <Label htmlFor="template-donor" className="mb-1">Donor</Label>
              <select
                id="template-donor"
                className="w-full rounded-md border bg-background px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                value={donorId}
                onChange={(e) => setDonorId(e.target.value)}
              >
                {sorted.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div role="group" aria-label="Template" className="flex flex-wrap gap-1 md:flex-col">
              {TEMPLATES.map((t) => (
                <Button key={t.kind} size="sm" aria-pressed={kind === t.kind} variant={kind === t.kind ? 'default' : 'outline'} className="md:justify-start" onClick={() => setKind(t.kind)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {channel === 'email' ? <>Subject: <span className="text-foreground">{DRAFT_SUBJECT[kind]}</span> · to {donor.email}</> : <>Text message to {donor.phone && fmtPhone(donor.phone)}</>}
            </p>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-sans text-sm" aria-label="Template preview">{body}</pre>
            <Button disabled={saving} onClick={use}>{saving ? 'Adding…' : 'Use this template'}</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
