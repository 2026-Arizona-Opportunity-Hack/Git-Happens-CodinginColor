import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore, type ChatTurn } from '@/store'
import { cn } from '@/lib/utils'
import { ChatMarkdown } from '@/components/ChatMarkdown'

// The conversation lives in the Shell so it survives switching pages and
// closing the panel. It's in memory only and resets on reload.
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

// A chat bubble in the bottom-right corner of every page. Clicking it opens
// the assistant as a side panel (full screen on phones) that closes with its
// X button or Escape, returning focus to the bubble.
export function Assistant({ chat }: { chat: Chat }) {
  const [open, setOpen] = useState(false)
  const bubble = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => bubble.current?.focus())
  }, [])
  return open ? (
    <ChatPanel chat={chat} onClose={close} />
  ) : (
    <button
      ref={bubble}
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open the assistant"
      aria-haspopup="dialog"
      className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-cic-dark text-white shadow-lg transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-cic-green focus-visible:outline-none motion-reduce:transition-none md:right-6 md:bottom-6"
    >
      <MessageCircle aria-hidden className="size-6" />
      {chat.turns.length > 0 && <span aria-hidden className="absolute top-1 right-1 size-3 rounded-full border-2 border-white bg-cic-green" />}
    </button>
  )
}

// The assistant answers from the same data the signed-in user can see (the
// Worker builds its context from their scoped records). It can't change
// anything itself; replies can offer buttons (see ChatMarkdown) that the
// person presses.
function ChatPanel({ chat: { turns, busy, error, send }, onClose }: { chat: Chat; onClose: () => void }) {
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [turns, busy])

  // Focus the message box on open; Escape closes from anywhere in the panel.
  useEffect(() => {
    input.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
      role="dialog"
      aria-label="Assistant"
      className="fixed inset-0 z-50 flex flex-col bg-background shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[26rem] sm:border-l sm:border-sidebar-border"
    >
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-cic-dark"><MessageCircle aria-hidden className="size-4" /> Assistant</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close the assistant">
          <X aria-hidden />
        </Button>
      </header>
      <div
        ref={log}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-4 text-sm"
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
        className="flex items-end gap-2 border-t bg-background p-3"
      >
        <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
        <Textarea
          ref={input}
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
