import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader, SectionTitle } from '@/components/common'
import { SendDraft } from '@/components/SendDraft'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/store'
import { calendarLink, daysBetween, fmtDate, quarterlyTouchDue, retentionStatus, yearOf } from '@/lib/logic'
import { cn } from '@/lib/utils'

// The board member's work queue. The system drafts and reminds; a human sends.
export default function FollowUps() {
  const { donors, gifts, drafts, today, createDraft, updateDraft } = useStore()
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
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((d) => (
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
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section id="next-steps" tabIndex={-1} className="scroll-mt-24 md:scroll-mt-4 outline-none">
          <SectionTitle>Next steps{overdue > 0 && <span className="text-red-700"> ({overdue} overdue)</span>}</SectionTitle>
          <Card>
            <CardContent>
              <ul className="divide-y">
                {steps.map((d) => {
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
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionTitle>Quarterly update due ({touchDue.length})</SectionTitle>
          <Card>
            <CardContent>
              <ul className="divide-y">
                {touchDue.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                      <div className="text-sm text-muted-foreground">
                        {d.lastTouchAt ? `Last contact ${fmtDate(d.lastTouchAt)}` : 'Never contacted'}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={hasPending(d.id)} onClick={() => createDraft(d.id, 'quarterly-update')}>
                      {hasPending(d.id) ? 'Drafted' : 'Draft update'}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {lapsed.length > 0 && (
            <>
              <h2 id="lapsed" tabIndex={-1} className="mt-8 mb-3 scroll-mt-24 md:scroll-mt-4 text-lg text-red-700 outline-none">Lapsed donors ({lapsed.length}) — call before year end</h2>
              <Card>
                <CardContent>
                  <ul className="divide-y">
                    {lapsed.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                        <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                        <Button size="sm" variant="outline" disabled={hasPending(d.id)} onClick={() => createDraft(d.id, 'lapsed-nudge')}>
                          {hasPending(d.id) ? 'Drafted' : 'Draft nudge'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </div>
    </>
  )
}
