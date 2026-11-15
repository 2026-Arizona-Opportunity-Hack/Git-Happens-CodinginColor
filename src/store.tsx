import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { reminders } from '@/lib/reminders'
import type { BoardMember, Channel, Donor, CicEvent, Draft, DraftKind, Gift, ImportRecord, Interaction, RawDonorRow, Role, Source } from '@/data/types'

// Client for the Worker API. The server scopes every read to the caller, so
// `donors` is already the set this user may see. Actions call one route, then
// reload the bootstrap so the UI shows exactly what D1 holds.

interface Session { role: Role; memberId: string }

interface Bootstrap {
  session: Session
  today: string
  boardMembers: BoardMember[]
  events: CicEvent[]
  donors: Donor[]
  gifts: Gift[]
  interactions: Interaction[]
  drafts: Draft[]
  imports: ImportRecord[] // newest first; empty for board members
}

class ApiError extends Error {}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

// Returns a current WorkOS access token (AuthKit refreshes it as needed).
type GetToken = () => Promise<string>

async function api<T>(token: GetToken, path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`)
  return data as T
}

function useStoreState(data: Bootstrap, token: GetToken, reload: () => Promise<void>) {
  // Draft edits are drawn over the server copy and save after a pause in
  // typing, so a reload never overwrites what someone is mid-way through.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const drafts = data.drafts.map((d) => (d.id in edits ? { ...d, body: edits[d.id] } : d))
  const pendingEdits = useRef(new Map<string, { timer: number; body: string }>())
  const saveEdit = async (id: string) => {
    const p = pendingEdits.current.get(id)
    if (!p) return
    clearTimeout(p.timer)
    pendingEdits.current.delete(id)
    await api(token, `drafts/${id}`, 'PATCH', { body: p.body })
  }

  // Runs one API call, reloads, and returns its result, or undefined after
  // telling the user what went wrong.
  const run = async <T,>(call: () => Promise<T>): Promise<T | undefined> => {
    try {
      const result = await call()
      await reload()
      return result
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not reach the server')
      return undefined
    }
  }

  const member = (id: string) => data.boardMembers.find((m) => m.id === id)!

  const createDraft = (donorId: string, kind: DraftKind, channel: 'email' | 'text' = 'email') =>
    run(() => api<Draft>(token, 'drafts', 'POST', { donorId, kind, channel }))

  const updateDraft = (id: string, body: string) => {
    setEdits((e) => ({ ...e, [id]: body }))
    clearTimeout(pendingEdits.current.get(id)?.timer)
    pendingEdits.current.set(id, { body, timer: window.setTimeout(() => run(() => saveEdit(id)), 600) })
  }

  // Human approval is the only path to "sent"; the server logs the interaction.
  const approveDraft = (id: string) =>
    run(async () => {
      await saveEdit(id)
      return api(token, `drafts/${id}/approve`, 'POST')
    })

  const discardDraft = (id: string) =>
    run(async () => {
      clearTimeout(pendingEdits.current.get(id)?.timer)
      pendingEdits.current.delete(id)
      return api(token, `drafts/${id}/discard`, 'POST')
    })

  const logInteraction = (donorId: string, channel: Channel, summary: string) =>
    run(() => api(token, `donors/${donorId}/interactions`, 'POST', { channel, summary }))

  const setNextStep = (donorId: string, nextStep: Donor['nextStep']) =>
    run(() => api(token, `donors/${donorId}/next-step`, 'PUT', nextStep ?? {}))

  const reassign = (donorId: string, ownerId: string) =>
    run(() => api(token, `donors/${donorId}/owner`, 'PUT', { ownerId }))

  const importRows = (rows: RawDonorRow[], files: Partial<Record<Source, string>> = {}) =>
    run(() => api<{ created: number; merged: number; clusters: number; gifts: number; skippedGifts: number }>(token, 'import', 'POST', { rows, files }))

  // Fetched by the Members widget itself, whenever its token runs out.
  const widgetToken = useCallback(() => api<{ token: string }>(token, 'widget-token', 'POST').then((r) => r.token), [token])

  // The assistant only reads, so there's nothing to reload afterwards.
  const chat = (messages: ChatTurn[]) => api<{ reply: string }>(token, 'chat', 'POST', { messages }).then((r) => r.reply)

  return {
    ...data, drafts, member, chat,
    createDraft, updateDraft, approveDraft, discardDraft, logInteraction, setNextStep, reassign, importRows, widgetToken,
  }
}

type Store = ReturnType<typeof useStoreState>
const Ctx = createContext<Store | null>(null)

function Loaded({ data, token, reload, children }: {
  data: Bootstrap; token: GetToken; reload: () => Promise<void>; children: ReactNode
}) {
  return <Ctx.Provider value={useStoreState(data, token, reload)}>{children}</Ctx.Provider>
}

export function StoreProvider({ token, onSignOut, children }: { token: GetToken; onSignOut: () => void; children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setData(await api<Bootstrap>(token, 'bootstrap'))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server')
    }
  }, [token])

  useEffect(() => {
    reload()
  }, [reload])

  if (!data)
    return (
      <div role="status" className="space-y-3 p-8 text-muted-foreground">
        <p>{error ? `Could not load donor data: ${error}` : 'Loading donor data…'}</p>
        {error && <button className="underline" onClick={onSignOut}>Sign out</button>}
      </div>
    )
  return <Loaded data={data} token={token} reload={reload}>{children}</Loaded>
}

export const useStore = () => useContext(Ctx)!

// Reminders for the signed-in user; drives the Notifications page and nav badge.
export function useReminders() {
  const s = useStore()
  return reminders({ ...s, role: s.session.role })
}
