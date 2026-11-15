import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore, type ChatTurn } from '@/store'
import { cn } from '@/lib/utils'
import { ChatMarkdown } from '@/components/ChatMarkdown'

// Bottom-right assistant. It answers from the same data the signed-in user can
// see (the Worker builds its context from their scoped records). It can't
// change anything itself; replies can offer buttons (see ChatMarkdown) that
// the person presses. The conversation lives in memory and resets on reload.
export function ChatWidget() {
  const { chat } = useStore()
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [turns, busy])

  const close = () => {
    setOpen(false)
    toggle.current?.focus()
  }

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    const next: ChatTurn[] = [...turns, { role: 'user', content: text }]
    setTurns(next)
    setDraft('')
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

  // Enter sends; Shift+Enter starts a new line.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) send(e)
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          id="assistant"
          aria-label="Assistant"
          onKeyDown={(e) => e.key === 'Escape' && close()}
          className="flex h-[min(32rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
        >
          <header className="flex items-center justify-between bg-cic-dark px-4 py-2 text-white">
            <h2 className="text-sm font-semibold text-white">Assistant</h2>
            <button type="button" onClick={close} className="rounded p-1 hover:bg-white/20" aria-label="Close assistant">
              <X className="size-4" aria-hidden />
            </button>
          </header>
          <div ref={log} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
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
            {busy && <p className="text-muted-foreground" role="status">Thinking…</p>}
            {error && <p className="text-destructive" role="alert">{error}</p>}
          </div>
          <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
            <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
            <Textarea
              id="assistant-input"
              ref={input}
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
      )}
      <Button
        ref={toggle}
        size="icon"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="assistant"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="size-12 rounded-full shadow-lg"
      >
        {open ? <X className="size-5" aria-hidden /> : <MessageCircle className="size-5" aria-hidden />}
      </Button>
    </div>
  )
}
