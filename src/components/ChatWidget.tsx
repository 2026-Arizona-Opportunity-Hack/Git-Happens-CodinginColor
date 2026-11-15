import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { ChevronLeft, MessageCircle, Send, X } from 'lucide-react'
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

// Whether the docked assistant is open, kept per browser; it starts open.
const OPEN_KEY = 'cic-assistant-closed'
function useDocked() {
  const [docked, setDocked] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) !== '1'
    } catch {
      return true
    }
  })
  const set = (open: boolean) => {
    try {
      if (open) localStorage.removeItem(OPEN_KEY)
      else localStorage.setItem(OPEN_KEY, '1')
    } catch {
      // private mode: it resets on reload
    }
    setDocked(open)
  }
  return [docked, set] as const
}

// On wide screens the assistant is a column docked to the right of every
// page; its X slides it shut and a tab on the right edge slides it back. On
// smaller screens a chat bubble opens it full screen, closing with X or Escape.
export function Assistant({ chat }: { chat: Chat }) {
  const [docked, setDocked] = useDocked()
  const [overlay, setOverlay] = useState(false)
  const bubble = useRef<HTMLButtonElement>(null)
  const tab = useRef<HTMLButtonElement>(null)
  const dockedInput = useRef<HTMLTextAreaElement>(null)
  const closeOverlay = useCallback(() => {
    setOverlay(false)
    requestAnimationFrame(() => bubble.current?.focus())
  }, [])
  const closeDocked = () => {
    setDocked(false)
    requestAnimationFrame(() => tab.current?.focus())
  }
  const openDocked = () => {
    setDocked(true)
    requestAnimationFrame(() => dockedInput.current?.focus())
  }
  return (
    <>
      <div className="sticky top-0 hidden h-screen lg:block">
        {/* The panel keeps its width while the column slides, so it doesn't reflow. */}
        <div
          inert={!docked}
          className={cn('h-full overflow-hidden transition-[width] duration-200 motion-reduce:transition-none', docked ? 'w-[24rem]' : 'w-0')}
        >
          <ChatPanel chat={chat} onClose={closeDocked} input={dockedInput} className="h-full w-[24rem] border-l border-sidebar-border" />
        </div>
        {!docked && (
          <button
            ref={tab}
            type="button"
            onClick={openDocked}
            aria-label="Open the assistant"
            className="fixed top-1/2 right-0 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-md bg-cic-dark px-1.5 py-3 text-white shadow-lg hover:bg-cic-dark/90 focus-visible:ring-4 focus-visible:ring-cic-green focus-visible:outline-none"
          >
            <ChevronLeft aria-hidden className="size-4" />
            <MessageCircle aria-hidden className="size-5" />
          </button>
        )}
      </div>
      {overlay ? (
        <ChatPanel chat={chat} onClose={closeOverlay} dialog className="fixed inset-0 z-50 shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[26rem] sm:border-l sm:border-sidebar-border lg:hidden" />
      ) : (
        <button
          ref={bubble}
          type="button"
          onClick={() => setOverlay(true)}
          aria-label="Open the assistant"
          aria-haspopup="dialog"
          className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-cic-dark text-white shadow-lg transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-cic-green focus-visible:outline-none motion-reduce:transition-none md:right-6 md:bottom-6 lg:hidden"
        >
          <MessageCircle aria-hidden className="size-6" />
          {chat.turns.length > 0 && <span aria-hidden className="absolute top-1 right-1 size-3 rounded-full border-2 border-white bg-cic-green" />}
        </button>
      )}
    </>
  )
}

// The assistant answers from the same data the signed-in user can see (the
// Worker builds its context from their scoped records). It can't change
// anything itself; replies can offer buttons (see ChatMarkdown) that the
// person presses.
// As a dialog (phones) it takes focus and closes on Escape; docked, it's a
// landmark beside the page and leaves focus alone.
function ChatPanel({ chat: { turns, busy, error, send }, onClose, dialog, input: inputRef, className }: {
  chat: Chat; onClose: () => void; dialog?: boolean; input?: RefObject<HTMLTextAreaElement | null>; className?: string
}) {
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const ownInput = useRef<HTMLTextAreaElement>(null)
  const input = inputRef ?? ownInput
  const inputId = useId()

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [turns, busy])

  // Focus the message box on open; Escape closes from anywhere in the panel.
  useEffect(() => {
    if (!dialog) return
    input.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, input, onClose])

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

  const Root = dialog ? 'section' : 'aside'
  return (
    <Root
      role={dialog ? 'dialog' : undefined}
      aria-label="Assistant"
      className={cn('flex flex-col bg-background', className)}
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
          <div className="flex flex-wrap gap-2">
            {['Who is overdue for a touch?', 'Who lapsed this year?', "What's coming up this month?"].map((q) => (
              <Button key={q} type="button" size="sm" variant="outline" className="h-auto whitespace-normal py-1.5 text-left" onClick={() => send(q)}>
                {q}
              </Button>
            ))}
          </div>
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
        <label htmlFor={inputId} className="sr-only">Message the assistant</label>
        <Textarea
          ref={input}
          id={inputId}
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
    </Root>
  )
}
