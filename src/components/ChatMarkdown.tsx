import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import { visit } from 'unist-util-visit'
import { Check, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { chatAction, type Attrs } from '@/lib/actions'
import { byDateDesc, fmtDate, money } from '@/lib/logic'
import { useStore } from '@/store'

// Renders assistant replies. The model writes Markdown plus two block
// directives, `::donor{id}` and `::action{...}`, and nothing else becomes a
// component: raw HTML and images are never rendered, links only work inside
// the app, and every action is a button the person has to press. Its label is
// written here from the checked arguments, never by the model, and the click
// goes through the same API calls (and the same server checks) as the pages.
// The checks and labels are chatAction in src/lib/actions.ts.

const BLOCKS = ['donor', 'action']

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
  const { donors, gifts, ownerName } = useStore()
  const d = donors.find((x) => x.id === id)
  if (!d) return <p className="text-muted-foreground">(That donor isn't one you can see.)</p>
  const theirs = gifts.filter((g) => g.donorId === d.id).sort(byDateDesc)
  return (
    <Link to={`/donors/${d.id}`} className="my-2 block rounded-md border bg-background p-3 no-underline hover:border-cic-dark">
      <span className="block font-semibold text-foreground">{d.name}</span>
      <span className="block text-xs text-muted-foreground">
        {d.org && `${d.org} · `}Owner: {ownerName(d)}
      </span>
      <span className="block text-xs text-muted-foreground">
        {theirs[0] ? `Last gift ${money(theirs[0].amount)} on ${fmtDate(theirs[0].date)}` : 'No gifts yet'}
        {` · Lifetime ${money(theirs.reduce((s, g) => s + g.amount, 0))}`}
      </span>
    </Link>
  )
}

function ActionButton(props: Attrs) {
  const action = chatAction(props, useStore())
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
      <span className="flex-1">{state === 'done' ? `Done: ${action.label}` : action.label}</span>
      {/* Says it's a button to press: the label alone reads like a sentence. */}
      {state !== 'done' && (
        <span className="flex shrink-0 items-center gap-1 self-center rounded bg-cic-dark px-2 py-0.5 text-xs font-semibold text-white">
          <MousePointerClick aria-hidden className="size-3" /> {state === 'busy' ? 'Saving…' : 'Apply'}
        </span>
      )}
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
