import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarPlus, Download, MessageSquareText, Gift as GiftIcon, Mail, MessageSquare, Phone, StickyNote, Users } from 'lucide-react'
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
import { draftChannel, THANK_YOU_DAYS, thankableGift } from '@/lib/drafts'
import { funderPacket } from '@/lib/packet'
import { useStore } from '@/store'
import { useAsk } from '@/components/ChatWidget'
import { fmtPhone } from '@/lib/utils'
import { byDateDesc, calendarLink, donorTimeline, fmtDate, money, offeredEvents, retentionStatus, totalsByYear, UNASSIGNED, yearOf } from '@/lib/logic'

const CHANNEL_ICON = { email: Mail, text: MessageSquare, call: Phone, 'in-person': Users, note: StickyNote }

// Funder packet: giving totals and gift history. The browser saves it with no
// sign on the page, so a toast names the file.
function downloadPacket(d: Donor, gifts: Gift[], today: string) {
  const file = `CIC_FunderPacket_${d.name.replace(/\W+/g, '')}_${today.slice(0, 4)}.md`
  try {
    const url = URL.createObjectURL(new Blob([funderPacket(d, gifts, today)], { type: 'text/markdown' }))
    const a = document.createElement('a')
    a.href = url
    a.download = file
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(`Downloaded ${file}`, { description: 'Check your Downloads folder.' })
  } catch {
    toast.error("Couldn't make the funder packet. Try again.")
  }
}

export default function DonorDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useStore()
  const ask = useAsk()
  const donor = s.donors.find((d) => d.id === id)
  const [channel, setChannel] = useState<Channel>('text')
  const [note, setNote] = useState('')
  const [stepText, setStepText] = useState(donor?.nextStep?.text ?? '')
  const [stepDue, setStepDue] = useState(donor?.nextStep?.due ?? '')
  // Set by an "Invite to" chip; retyping the step unlinks it from the event.
  const [stepEvent, setStepEvent] = useState(donor?.nextStep?.eventId)
  // The step can also change outside this form (an assistant button), so
  // follow the saved value whenever it changes.
  const step = donor?.nextStep
  const stepKey = `${step?.text}|${step?.due}|${step?.eventId}`
  const [seenStep, setSeenStep] = useState(stepKey)
  if (stepKey !== seenStep) {
    setSeenStep(stepKey)
    setStepText(step?.text ?? ''); setStepDue(step?.due ?? ''); setStepEvent(step?.eventId)
  }

  if (!donor) return <p>Donor not found, or not assigned to you. <Link className="underline" to="/donors">Back to donors</Link></p>

  const gifts = s.gifts.filter((g) => g.donorId === donor.id).sort(byDateDesc)
  const touches = s.interactions.filter((i) => i.donorId === donor.id)
  const timeline = donorTimeline(gifts, touches)
  const byYear = [...totalsByYear(gifts).entries()].sort((a, b) => a[0] - b[0])
  const max = Math.max(1, ...byYear.map(([, v]) => v))
  const upcoming = offeredEvents(s.events, s.today)

  // One click: the next step and a draft invitation, both saved.
  const invite = async (eventId: string) => {
    const r = await s.invite(donor.id, eventId)
    if (!r) return
    setStepText(r.nextStep.text); setStepDue(r.nextStep.due); setStepEvent(r.nextStep.eventId)
    toast.success(`Next step set for ${fmtDate(r.nextStep.due)}, and an invitation drafted.`, { action: { label: 'Review draft', onClick: () => nav('/follow-ups') } })
  }

  // Email if there's an address, else text; neither means no draft to send.
  const draftVia = draftChannel(donor)
  const thankable = thankableGift(gifts, s.today)
  const draft = async (kind: Parameters<typeof s.createDraft>[1]) => {
    // AI-written drafts can take several seconds.
    const t = toast.loading('Writing the draft…')
    if (!(await s.createDraft(donor.id, kind, draftVia))) return void toast.dismiss(t)
    toast.success('Draft created. Review it in Follow-ups.', { id: t, action: { label: 'Open', onClick: () => nav('/follow-ups') } })
  }

  return (
    <>
      <PageHeader
        title={donor.name}
        description={[donor.org, donor.email, donor.phone && fmtPhone(donor.phone)].filter(Boolean).join(' · ')}
        actions={
          <>
            {/* The assistant turns what happened into a log, a next step and a draft, as buttons to press. */}
            <Button variant="outline" onClick={() => ask(`Debrief on ${donor.name}: `)}>
              <MessageSquareText aria-hidden /> Debrief
            </Button>
            <Button variant="outline" onClick={() => downloadPacket(donor, gifts, s.today)}>
              <Download aria-hidden /> Funder packet
            </Button>
          </>
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

          <Notes key={donor.id} donorId={donor.id} saved={donor.notes ?? ''} readOnly={s.sample} save={s.saveNotes} />
          <Contact key={`contact-${donor.id}`} donor={donor} readOnly={s.sample} save={s.saveContact} />

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
              {/* Custom columns created while importing. */}
              {Object.entries(donor.extra ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><span>{k}</span><span className="text-right">{v}</span></div>
              ))}
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
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (await s.setNextStep(donor.id, stepText && stepDue ? { text: stepText, due: stepDue, eventId: stepEvent } : undefined))
                    toast.success('Next step saved')
                }}
              >
                <div>
                  <Label htmlFor="step" className="mb-1">What</Label>
                  <Input id="step" value={stepText} onChange={(e) => { setStepText(e.target.value); setStepEvent(undefined) }} placeholder="e.g. Invite to Day of Compute" />
                </div>
                <div>
                  <Label htmlFor="due" className="mb-1">Due</Label>
                  <Input id="due" type="date" value={stepDue} onChange={(e) => setStepDue(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">Save next step</Button>
              </form>
              {donor.nextStep && (
                <a className="mt-3 inline-flex items-center gap-1 text-sm text-cic-dark underline" href={calendarLink(donor.nextStep, donor, location.origin)} target="_blank" rel="noreferrer">
                  <CalendarPlus className="size-4" aria-hidden /> Add to Google Calendar<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              {upcoming.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 text-sm font-medium">Invite to an event</p>
                  <ul className="space-y-1">
                    {upcoming.map((ev) => (
                      <li key={ev.id}>
                        <Button type="button" size="sm" variant="secondary" className="h-auto w-full justify-start whitespace-normal py-1.5 text-left" aria-label={`Invite to ${ev.name}, ${fmtDate(ev.date)}`} onClick={() => invite(ev.id)}>
                          {ev.name}, {fmtDate(ev.date)}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Log outreach</CardTitle></CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!note.trim() || !(await s.logInteraction(donor.id, channel, note.trim()))) return
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
              {!draftVia && <p className="text-sm text-muted-foreground">No contact info: add an email or phone number for {donor.name} under <a className="underline" href="#donor-contact">Contact</a> before drafting a message.</p>}
              <Button variant="outline" disabled={!draftVia || !thankable} aria-describedby={draftVia && !thankable ? 'no-thank-you' : undefined} onClick={() => draft('thank-you')}>Thank-you</Button>
              {draftVia && !thankable && <p id="no-thank-you" className="text-sm text-muted-foreground">No gift in the last {THANK_YOU_DAYS} days to thank them for.</p>}
              <Button variant="outline" disabled={!draftVia} onClick={() => draft('quarterly-update')}>Quarterly update</Button>
              <Button variant="outline" disabled={!draftVia} onClick={() => draft('follow-up')}>Follow-up</Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  )
}

// Email and phone, saved together; a blank field clears it.
function Contact({ donor, readOnly, save }: {
  donor: Donor; readOnly: boolean; save: (donorId: string, contact: { email: string; phone: string }) => Promise<unknown>
}) {
  const [email, setEmail] = useState(donor.email ?? '')
  const [phone, setPhone] = useState(donor.phone ?? '')
  const [busy, setBusy] = useState(false)
  const changed = email.trim() !== (donor.email ?? '') || phone.trim() !== (donor.phone ?? '')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const ok = await save(donor.id, { email: email.trim(), phone: phone.trim() })
    setBusy(false)
    if (ok !== undefined) toast.success('Contact details saved.')
  }
  return (
    <Card id="donor-contact">
      <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-1">
            <Label htmlFor="donor-email">Email</Label>
            <Input id="donor-email" type="email" maxLength={200} value={email} readOnly={readOnly} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="donor-phone">Phone</Label>
            <Input id="donor-phone" type="tel" maxLength={200} value={phone} readOnly={readOnly} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {readOnly
            ? <p className="text-xs text-muted-foreground">Sample data is view-only.</p>
            : <Button type="submit" variant="outline" disabled={!changed || busy}>{busy ? 'Saving…' : 'Save contact'}</Button>}
        </form>
      </CardContent>
    </Card>
  )
}

// Saves a second after typing stops, and when the box loses focus. The AI
// reads these notes when it writes this donor's drafts.
function Notes({ donorId, saved, readOnly, save }: {
  donorId: string; saved: string; readOnly: boolean; save: (donorId: string, notes: string) => Promise<unknown>
}) {
  const [text, setText] = useState(saved)
  const [state, setState] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved')
  const timer = useRef<number>(undefined)
  // Refs, so the timer and the unmount save read current values.
  const latest = useRef(text)
  const savedRef = useRef(saved)
  const saveRef = useRef(save)
  useEffect(() => {
    latest.current = text
    savedRef.current = saved
    saveRef.current = save
  })

  const flush = async () => {
    clearTimeout(timer.current)
    const value = latest.current
    if (value.trim() === savedRef.current.trim()) return setState('saved')
    setState('saving')
    const ok = await save(donorId, value)
    setState(ok === undefined ? 'error' : latest.current === value ? 'saved' : 'unsaved')
  }
  // Save what's typed when leaving the page.
  // (The component is keyed by donor, so this runs once, on unmount.)
  useEffect(() => () => {
    clearTimeout(timer.current)
    if (latest.current.trim() !== savedRef.current.trim()) void saveRef.current(donorId, latest.current)
  }, [donorId])

  const status = { saved: 'Saved', unsaved: 'Not saved yet', saving: 'Saving…', error: "Couldn't save. Keep typing to try again." }[state]
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle><label htmlFor="donor-notes">Notes</label></CardTitle>
        {!readOnly && <span aria-live="polite" className={state === 'error' ? 'text-sm text-red-800' : 'text-sm text-muted-foreground'}>{status}</span>}
      </CardHeader>
      <CardContent>
        <Textarea
          id="donor-notes"
          rows={4}
          value={text}
          readOnly={readOnly}
          maxLength={10000}
          aria-describedby="donor-notes-hint"
          placeholder="Interests, family, how they like to be contacted, what they asked about…"
          onChange={(e) => {
            setText(e.target.value)
            latest.current = e.target.value
            setState('unsaved')
            clearTimeout(timer.current)
            timer.current = window.setTimeout(flush, 1000)
          }}
          onBlur={flush}
        />
        <p id="donor-notes-hint" className="mt-2 text-xs text-muted-foreground">
          {readOnly ? 'Sample data is view-only.' : 'The AI uses these notes when it writes drafts for this donor.'}
        </p>
      </CardContent>
    </Card>
  )
}
