import { useState } from 'react'
import { Copy, Mail, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Donor, Draft } from '@/data/types'
import { DRAFT_SUBJECT } from '@/lib/drafts'
import { useStore } from '@/store'

// Sends happen from the board member's own mailbox or phone, so replies come
// back to them and the app needs no mail keys. Each button opens a compose
// window with the draft filled in; once they've pressed Send there, they
// confirm here and the server marks it sent and logs the touch.

const q = encodeURIComponent

// Compose links stop working reliably past roughly 2,000 characters; beyond
// that, only Copy is offered.
const MAX_URL = 1900

function composeLinks(draft: Draft, donor: Donor) {
  const subject = DRAFT_SUBJECT[draft.kind]
  const to = donor.email ?? ''
  if (draft.channel === 'text')
    return [{ label: 'Open in Messages', icon: MessageSquare, href: `sms:${donor.phone ?? ''}?&body=${q(draft.body)}` }]
  return [
    { label: 'Gmail', icon: Mail, href: `https://mail.google.com/mail/?view=cm&fs=1&to=${q(to)}&su=${q(subject)}&body=${q(draft.body)}` },
    { label: 'Outlook', icon: Mail, href: `https://outlook.office.com/mail/deeplink/compose?to=${q(to)}&subject=${q(subject)}&body=${q(draft.body)}` },
    { label: 'Email app', icon: Mail, href: `mailto:${q(to)}?subject=${q(subject)}&body=${q(draft.body)}` },
  ]
}

export function SendDraft({ draft, donor }: { draft: Draft; donor: Donor }) {
  const { approveDraft, discardDraft } = useStore()
  const [opened, setOpened] = useState(false)
  const links = composeLinks(draft, donor)
  const tooLong = links.some((l) => l.href.length > MAX_URL)
  const missing = draft.channel === 'text' ? !donor.phone && 'phone number' : !donor.email && 'email address'

  const copy = async () => {
    await navigator.clipboard.writeText(draft.channel === 'email' ? `Subject: ${DRAFT_SUBJECT[draft.kind]}\n\n${draft.body}` : draft.body)
    toast.success('Copied the draft')
    setOpened(true)
  }
  const markSent = async () => {
    if (await approveDraft(draft.id)) toast.success(`Marked sent and logged for ${donor.name}`)
  }

  if (opened)
    return (
      <div className="flex w-full flex-wrap items-center gap-2" role="group" aria-label={`Confirm the message to ${donor.name}`}>
        <span className="text-sm">Did you send it?</span>
        <Button onClick={markSent}>Yes, mark sent</Button>
        <Button variant="ghost" onClick={() => setOpened(false)}>Not yet</Button>
      </div>
    )

  return (
    <div className="w-full space-y-2">
      {missing && <p className="text-sm text-muted-foreground">No {missing} on file for {donor.name}; you'll need to add it in the compose window.</p>}
      {tooLong && <p className="text-sm text-muted-foreground">This draft is too long to open directly. Copy it, then paste it into a new message.</p>}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Send the draft to ${donor.name}`}>
        {!tooLong &&
          links.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('https:') ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={() => setOpened(true)}
              className={buttonVariants()}
            >
              <Icon aria-hidden /> {label}
              {href.startsWith('https:') && <span className="sr-only"> (opens in a new tab)</span>}
            </a>
          ))}
        <Button variant="outline" onClick={copy}><Copy aria-hidden /> Copy</Button>
        <Button variant="ghost" onClick={() => discardDraft(draft.id)}>Discard</Button>
      </div>
    </div>
  )
}
