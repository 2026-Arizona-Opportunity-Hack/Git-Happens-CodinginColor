import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import { visit } from 'unist-util-visit'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Channel, DraftKind } from '@/data/types'
import { fmtDate, money } from '@/lib/logic'
import { useStore } from '@/store'

// Renders assistant replies. The model writes Markdown plus two block
// directives, `::donor{id}` and `::action{...}`, and nothing else becomes a
// component: raw HTML and images are never rendered, links only work inside
// the app, and every action is a button the person has to press. Its label is
// written here from the checked arguments, never by the model, and the click
// goes through the same API calls (and the same server checks) as the pages.

const CHANNELS: Channel[] = ['email', 'text', 'call', 'in-person', 'note']
const KINDS: DraftKind[] = ['thank-you', 'quarterly-update', 'lapsed-nudge', 'follow-up']
const BLOCKS = ['donor', 'action']

type Attrs = Record<string, string | undefined>

interface DirectiveNode {
  type: string
  name: string
  attributes?: Attrs | null
  children?: { type: string; value?: string }[]
  data?: { hName?: string; hProperties?: Attrs }
}

// Known block directives become <donor>/<action> elements. Anything else,
// including `:word` that remark-directive reads out of ordinary prose, goes
// back to the text it came from.
function remarkChatBlocks() {
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, (node, index, parent) => {
      if (!['textDirective', 'leafDirective', 'containerDirective'].includes(node.type)) return
      const d = node as unknown as DirectiveNode
      if (d.type === 'leafDirective' && BLOCKS.includes(d.name)) {
        d.data = { hName: d.name, hProperties: { ...d.attributes } }
        return
      }
      const inner = (d.children ?? []).map((c) => c.value ?? '').join('')
      const prefix = d.type === 'textDirective' ? ':' : d.type === 'leafDirective' ? '::' : ':::'
      const text = { type: 'text', value: `${prefix}${d.name}${inner ? `[${inner}]` : ''}` }
      if (parent && index !== undefined) (parent as { children: unknown[] }).children[index] = text
    })
  }
}

function DonorCard({ id }: { id?: string }) {
  const { donors, gifts, member } = useStore()
  const d = donors.find((x) => x.id === id)
  if (!d) return <p className="text-muted-foreground">(That donor isn't one you can see.)</p>
  const theirs = gifts.filter((g) => g.donorId === d.id).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Link to={`/donors/${d.id}`} className="my-2 block rounded-md border bg-background p-3 no-underline hover:border-cic-dark">
      <span className="block font-semibold text-foreground">{d.name}</span>
      <span className="block text-xs text-muted-foreground">
        {d.org && `${d.org} · `}Owner: {member(d.ownerId)?.name ?? 'unassigned'}
      </span>
      <span className="block text-xs text-muted-foreground">
        {theirs[0] ? `Last gift ${money(theirs[0].amount)} on ${fmtDate(theirs[0].date)}` : 'No gifts yet'}
        {` · Lifetime ${money(theirs.reduce((s, g) => s + g.amount, 0))}`}
      </span>
    </Link>
  )
}

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

// Checks the model's arguments against what this person can see and returns
// the button's label and what it does, or why it can't be offered.
function useAction(a: Attrs): { label: string; run: () => Promise<unknown> } | { error: string } {
  const store = useStore()
  const donor = store.donors.find((d) => d.id === a.donor)
  const draft = store.drafts.find((d) => d.id === a.draft && d.status === 'pending')
  const draftDonor = draft && store.donors.find((d) => d.id === draft.donorId)
  const text = (s?: string, max = 300) => (s ?? '').trim().slice(0, max)

  switch (a.type) {
    case 'log': {
      const channel = a.channel as Channel
      if (!donor || !CHANNELS.includes(channel) || !text(a.summary)) break
      return { label: `Log ${channel} with ${donor.name}: "${text(a.summary)}"`, run: () => store.logInteraction(donor.id, channel, text(a.summary)) }
    }
    case 'next-step':
      if (!donor || !text(a.text) || !isDate(a.due)) break
      return {
        label: `Set ${donor.name}'s next step: "${text(a.text)}" by ${fmtDate(a.due!)}`,
        run: () => store.setNextStep(donor.id, { text: text(a.text), due: a.due! }),
      }
    case 'draft': {
      const kind = a.kind as DraftKind
      const channel = a.channel === 'text' ? 'text' : 'email'
      if (!donor || !KINDS.includes(kind)) break
      return { label: `Draft a ${kind.replace('-', ' ')} ${channel} to ${donor.name}`, run: () => store.createDraft(donor.id, kind, channel) }
    }
    case 'approve':
      if (!draft || !draftDonor) break
      return { label: `Approve and mark sent: ${draft.kind.replace('-', ' ')} to ${draftDonor.name}`, run: () => store.approveDraft(draft.id) }
    case 'discard':
      if (!draft || !draftDonor) break
      return { label: `Discard the ${draft.kind.replace('-', ' ')} draft to ${draftDonor.name}`, run: () => store.discardDraft(draft.id) }
    case 'reassign': {
      const owner = store.boardMembers.find((m) => m.id === a.owner)
      if (store.session.role !== 'admin' || !donor || !owner) break
      return { label: `Reassign ${donor.name} to ${owner.name}`, run: () => store.reassign(donor.id, owner.id) }
    }
  }
  return { error: "(The assistant suggested an action that isn't available.)" }
}

function ActionButton(props: Attrs) {
  const action = useAction(props)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  if ('error' in action) return <p className="text-muted-foreground">{action.error}</p>
  const go = async () => {
    setState('busy')
    // The store shows its own error toast and returns undefined on failure.
    setState((await action.run()) === undefined ? 'idle' : 'done')
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={go}
      disabled={state !== 'idle'}
      className="my-1 h-auto w-full justify-start whitespace-normal py-1.5 text-left"
    >
      {state === 'done' && <Check aria-hidden />}
      {state === 'done' ? `Done: ${action.label}` : action.label}
    </Button>
  )
}

const components = {
  // Only paths inside the app are links; anything else shows as plain text so
  // a reply can't send someone, or donor data, to another site.
  a: ({ href, children }: { href?: string; children?: ReactNode }) =>
    href?.startsWith('/') && !href.startsWith('//') ? <Link to={href} className="underline">{children}</Link> : <>{children}</>,
  img: () => null,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-2 overflow-x-auto"><table className="w-full text-xs">{children}</table></div>
  ),
  th: ({ children }: { children?: ReactNode }) => <th className="border-b px-1 py-0.5 text-left font-semibold">{children}</th>,
  td: ({ children }: { children?: ReactNode }) => <td className="border-b px-1 py-0.5">{children}</td>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="my-1 list-disc pl-5">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="my-1 list-decimal pl-5">{children}</ol>,
  p: ({ children }: { children?: ReactNode }) => <p className="my-1">{children}</p>,
  donor: ({ id }: Attrs) => <DonorCard id={id} />,
  action: (props: Attrs & { node?: unknown }) => {
    const { node: _, ...attrs } = props
    return <ActionButton {...attrs} />
  },
} as Components

export function ChatMarkdown({ children }: { children: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm, remarkDirective, remarkChatBlocks]} skipHtml components={components}>
      {children}
    </Markdown>
  )
}
