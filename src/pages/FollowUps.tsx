import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, SectionTitle } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/store'
import { daysBetween, fmtDate, quarterlyTouchDue, retentionStatus, yearOf } from '@/lib/logic'

// The board member's work queue. The system drafts and reminds; a human sends.
export default function FollowUps() {
  const { visibleDonors, gifts, drafts, today, createDraft, updateDraft, approveDraft, discardDraft } = useStore()
  const ids = new Set(visibleDonors.map((d) => d.id))
  const name = (id: string) => visibleDonors.find((d) => d.id === id)?.name

  const steps = visibleDonors.filter((d) => d.nextStep).sort((a, b) => a.nextStep!.due.localeCompare(b.nextStep!.due))
  const touchDue = visibleDonors.filter((d) => quarterlyTouchDue(d, today))
  const lapsed = visibleDonors.filter((d) => retentionStatus(gifts.filter((g) => g.donorId === d.id), yearOf(today)) === 'lapsed')
  const pending = drafts.filter((d) => d.status === 'pending' && ids.has(d.donorId))
  const hasPending = (donorId: string) => pending.some((p) => p.donorId === donorId)

  return (
    <>
      <PageHeader title="Follow-ups" description="Next steps, quarterly updates and drafts waiting for your approval." />

      {pending.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Drafts awaiting approval ({pending.length})</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <CardTitle>{name(d.donorId)}</CardTitle>
                  <CardDescription>{d.kind.replace('-', ' ')} · {d.channel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea aria-label={`Draft to ${name(d.donorId)}`} rows={7} value={d.body} onChange={(e) => updateDraft(d.id, e.target.value)} />
                </CardContent>
                <CardFooter className="gap-2">
                  <Button onClick={() => { approveDraft(d.id); toast.success(`Approved and logged for ${name(d.donorId)}`) }}>
                    Approve &amp; send
                  </Button>
                  <Button variant="ghost" onClick={() => discardDraft(d.id)}>Discard</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle>Next steps</SectionTitle>
          <Card>
            <CardContent>
              <ul className="divide-y">
                {steps.map((d) => {
                  const late = daysBetween(d.nextStep!.due, today)
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <Link to={`/donors/${d.id}`} className="font-medium text-cic-dark underline">{d.name}</Link>
                        <div className="text-sm">{d.nextStep!.text}</div>
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
              <h2 className="mt-8 mb-3 text-lg">Lapsed donors — call before year end</h2>
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
