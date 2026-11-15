import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/common'
import { useStore, type ChatTurn } from '@/store'
import { cn } from '@/lib/utils'
import { ChatMarkdown } from '@/components/ChatMarkdown'

// Tailwind's lg breakpoint: at and above it the assistant is a column on the
// right of every page; below it, it's the Assistant tab.
const WIDE = '(min-width: 64rem)'
export function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(WIDE)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => matchMedia(WIDE).matches,
  )
}

// The conversation lives in the Shell so it survives switching tabs and
// resizing between layouts. It's in memory only and resets on reload.
export function useChat() {
  const { chat } = useStore()
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (text: string) => {
    const next: ChatTurn[] = [...turns, { role: 'user', content: text }]
    setTurns(next)
    setError(null)
    setBusy(true)
    try {
      setTurns([...next, { role: 'assistant', content: await chat(next.slice(-40)) }])
    } catch (err) {
      // fetch throws TypeError when offline; anything else is the API's message
      setError(err instanceof TypeError || !(err instanceof Error) ? 'Could not reach the server' : err.message)
    } finally {
      setBusy(false)
    }
  }
  return { turns, busy, error, send }
}
export type Chat = ReturnType<typeof useChat>

// The assistant answers from the same data the signed-in user can see (the
// Worker builds its context from their scoped records). It can't change
// anything itself; replies can offer buttons (see ChatMarkdown) that the
// person presses. `column` is the right-hand panel; `page` is the tab.
export function ChatPanel({ chat: { turns, busy, error, send }, variant }: { chat: Chat; variant: 'column' | 'page' }) {
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const column = variant === 'column'

  useEffect(() => {
    if (column) log.current?.scrollTo({ top: log.current.scrollHeight })
    else window.scrollTo({ top: document.body.scrollHeight })
  }, [turns, busy, column])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    send(text)
  }

  // Enter sends; Shift+Enter starts a new line.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e)
  }

  return (
    <section
      aria-label={column ? 'Assistant' : undefined}
      className={cn('flex flex-col', column && 'sticky top-0 h-screen border-l border-sidebar-border bg-background')}
    >
      {column ? (
        <header className="border-b border-sidebar-border bg-sidebar px-4 py-3">
          <h2 className="text-sm font-semibold text-cic-dark">Assistant</h2>
        </header>
      ) : (
        <PageHeader title="Assistant" />
      )}
      <div
        ref={log}
        role="log"
        aria-live="polite"
        className={cn('flex-1 space-y-3 text-sm', column ? 'overflow-y-auto p-4' : 'min-h-[40vh] pb-4')}
      >
        {turns.length === 0 && (
          <p className="text-muted-foreground">
            Ask about your donors, gifts, follow-ups or events, like "Who is overdue for a touch?" I can see what you can see in the app. I'll offer buttons for changes, and nothing happens until you press one.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2',
              t.role === 'user' ? 'ml-auto bg-cic-dark text-white whitespace-pre-wrap' : 'bg-cic-tint text-foreground',
            )}
          >
            <span className="sr-only">{t.role === 'user' ? 'You: ' : 'Assistant: '}</span>
            {t.role === 'user' ? t.content : <ChatMarkdown>{t.content}</ChatMarkdown>}
          </div>
        ))}
        {busy && (
          <p role="status" className="flex w-fit items-center gap-2 rounded-lg bg-cic-tint px-3 py-2 text-muted-foreground">
            <span aria-hidden className="flex items-center gap-1">
              {['-0.3s', '-0.15s', '0s'].map((delay) => (
                <span key={delay} style={{ animationDelay: delay }} className="size-1.5 animate-bounce rounded-full bg-cic-dark motion-reduce:animate-none" />
              ))}
            </span>
            Thinking…
          </p>
        )}
        {error && <p className="text-destructive" role="alert">{error}</p>}
      </div>
      <form
        onSubmit={submit}
        className={cn('flex items-end gap-2 border-t bg-background', column ? 'p-3' : 'sticky bottom-0 -mx-4 p-4 md:-mx-8 md:px-8')}
      >
        <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
        <Textarea
          id="assistant-input"
          rows={1}
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question"
          className="max-h-32 min-h-9 resize-none"
        />
        <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send">
          <Send aria-hidden />
        </Button>
      </form>
    </section>
  )
}
