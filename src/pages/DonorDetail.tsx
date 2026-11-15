import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Download, Gift as GiftIcon, Mail, MessageSquare, Phone, StickyNote, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, SectionTitle, StatusBadge } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Channel, Donor, Gift } from '@/data/types'
import { useStore } from '@/store'
import { fmtDate, money, retentionStatus, totalsByYear, UNASSIGNED, yearOf } from '@/lib/logic'

const CHANNEL_ICON = { email: Mail, text: MessageSquare, call: Phone, 'in-person': Users, note: StickyNote }

// Funder packet: gift history + funded outcomes. Outcomes are a placeholder
// until Problem 1's read API is wired in.
function funderPacket(d: Donor, gifts: Gift[]) {
  const lines = [
    `# Funder packet: ${d.name}`,
    '',
    '## Gift history',
    '| Date | Amount | Program | Source |',
    '|---|---|---|---|',
    ...gifts.map((g) => `| ${g.date} | ${money(g.amount)} | ${g.program} | ${g.source} |`),
    '',
    `Lifetime: ${money(gifts.reduce((s, g) => s + g.amount, 0))}`,
    '',
    '## Funded outcomes',
    ...[...new Set(gifts.map((g) => g.program))].map((p) => `- ${p}: [students served, learning gain — from curriculum platform API]`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `CIC_FunderPacket_${d.name.replace(/\W+/g, '')}_${new Date().getFullYear()}.md`
  a.click()
}

export default function DonorDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useStore()
  const donor = s.donors.find((d) => d.id === id)
  const [channel, setChannel] = useState<Channel>('text')
  const [note, setNote] = useState('')
  const [stepText, setStepText] = useState(donor?.nextStep?.text ?? '')
  const [stepDue, setStepDue] = useState(donor?.nextStep?.due ?? '')

  if (!donor) return <p>Donor not found, or not assigned to you. <Link className="underline" to="/donors">Back to donors</Link></p>

  const gifts = s.gifts.filter((g) => g.donorId === donor.id).sort((a, b) => b.date.localeCompare(a.date))
  const touches = s.interactions.filter((i) => i.donorId === donor.id)
  const timeline = [
    ...gifts.map((g) => ({ date: g.date, kind: 'gift' as const, g })),
    ...touches.map((i) => ({ date: i.date, kind: 'touch' as const, i })),
  ].sort((a, b) => b.date.localeCompare(a.date))
  const byYear = [...totalsByYear(gifts).entries()].sort((a, b) => a[0] - b[0])
  const max = Math.max(1, ...byYear.map(([, v]) => v))
  const upcoming = s.events.filter((e) => e.date >= s.today)

  const draft = async (kind: Parameters<typeof s.createDraft>[1]) => {
    if (!(await s.createDraft(donor.id, kind, donor.email ? 'email' : 'text'))) return
    toast('Draft created. Review it in Follow-ups.', { action: { label: 'Open', onClick: () => nav('/follow-ups') } })
  }

  return (
    <>
      <PageHeader
        title={donor.name}
        description={[donor.org, donor.email, donor.phone].filter(Boolean).join(' · ')}
        actions={
          <Button variant="outline" onClick={() => funderPacket(donor, gifts)}>
            <Download aria-hidden /> Funder packet
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Giving by year</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-32 items-end gap-3" role="img" aria-label={byYear.map(([y, v]) => `${y}: ${money(v)}`).join(', ')}>
                {byYear.map(([y, v]) => (
                  <div key={y} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs">{money(v)}</span>
                    <div className="w-full max-w-16 rounded-t bg-cic-dark" style={{ height: `${(v / max) * 80}px` }} />
                    <span className="text-xs text-muted-foreground">{y}</span>
                  </div>
                ))}
                {byYear.length === 0 && <p className="text-muted-foreground">No gifts recorded.</p>}
              </div>
            </CardContent>
          </Card>

          <section>
            <SectionTitle>Timeline</SectionTitle>
            <ol className="relative space-y-4 border-l-2 border-cic-tint pl-6">
              {timeline.map((t) => {
                const Icon = t.kind === 'gift' ? GiftIcon : CHANNEL_ICON[t.i.channel]
                return (
                  <li key={t.kind === 'gift' ? t.g.id : t.i.id} className="relative">
                    <span className="absolute top-0.5 -left-[35px] flex size-6 items-center justify-center rounded-full border-2 border-cic-dark bg-white">
                      <Icon className="size-3 text-cic-dark" aria-hidden />
                    </span>
                    <div className="text-xs text-muted-foreground">{fmtDate(t.date)}</div>
                    {t.kind === 'gift' ? (
                      <div><strong>{money(t.g.amount)}</strong> gift · {t.g.program} <Badge variant="outline">{t.g.source}</Badge></div>
                    ) : (
                      <div><span className="font-medium capitalize">{t.i.channel}</span> by {s.member(t.i.byId).name}: {t.i.summary}</div>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Relationship</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Status {yearOf(s.today)}</span><StatusBadge status={retentionStatus(gifts, yearOf(s.today))} /></div>
              <div className="flex justify-between"><span>Last contact</span><span>{donor.lastTouchAt ? fmtDate(donor.lastTouchAt) : 'Never'}</span></div>
              <div>
                <Label className="mb-1">Owner</Label>
                {s.session.role === 'admin' ? (
                  <Select
                    items={[{ value: UNASSIGNED, label: 'Unassigned' }, ...s.boardMembers.map((m) => ({ value: m.id, label: m.name }))]}
                    value={donor.ownerId ?? UNASSIGNED}
                    onValueChange={(v) => s.reassign(donor.id, v === UNASSIGNED ? null : (v as string))}
                  >
                    <SelectTrigger aria-label="Owner" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {s.boardMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>{s.ownerName(donor)}</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Next step</CardTitle></CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  s.setNextStep(donor.id, stepText && stepDue ? { text: stepText, due: stepDue } : undefined)
                  toast.success('Next step saved')
                }}
              >
                <div>
                  <Label htmlFor="step" className="mb-1">What</Label>
                  <Input id="step" value={stepText} onChange={(e) => setStepText(e.target.value)} placeholder="e.g. Invite to Day of Compute" />
                </div>
                <div>
                  <Label htmlFor="due" className="mb-1">Due</Label>
                  <Input id="due" type="date" value={stepDue} onChange={(e) => setStepDue(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {upcoming.slice(0, 3).map((ev) => (
                    <Button key={ev.id} type="button" size="xs" variant="secondary" onClick={() => { setStepText(`Invite to ${ev.name}`); setStepDue(ev.date) }}>
                      Invite to {ev.name}
                    </Button>
                  ))}
                </div>
                <Button type="submit" className="w-full">Save next step</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Log outreach</CardTitle></CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!note.trim()) return
                  s.logInteraction(donor.id, channel, note.trim())
                  setNote('')
                  toast.success('Logged')
                }}
              >
                <div className="flex flex-wrap gap-1" role="group" aria-label="Channel">
                  {(['text', 'email', 'call', 'in-person'] as Channel[]).map((c) => (
                    <Button key={c} type="button" size="sm" aria-pressed={channel === c} variant={channel === c ? 'default' : 'outline'} onClick={() => setChannel(c)}>
                      {c}
                    </Button>
                  ))}
                </div>
                <Textarea aria-label="What happened" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Texted to say thanks; she asked about summer camp." />
                <Button type="submit" variant="outline" className="w-full">Log it</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Draft a message</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" onClick={() => draft('thank-you')}>Thank-you</Button>
              <Button variant="outline" onClick={() => draft('quarterly-update')}>Quarterly update</Button>
              <Button variant="outline" onClick={() => draft('follow-up')}>Follow-up</Button>
              <p className="text-xs text-muted-foreground">Drafts are never sent automatically. You approve each one.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  )
}
