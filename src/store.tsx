import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { BoardMember, Channel, Donor, CicEvent, Draft, DraftKind, Gift, Interaction, RawDonorRow, Role } from '@/data/types'

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
}

class ApiError extends Error {}

// Demo only: X-Demo-Session picks who we are. Replaced by the WorkOS token.
async function api<T>(who: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { 'X-Demo-Session': who, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`)
  return data as T
}

function useStoreState(data: Bootstrap, who: string, setWho: (w: string) => void, reload: () => Promise<void>) {
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
    await api(who, `drafts/${id}`, 'PATCH', { body: p.body })
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
    run(() => api<Draft>(who, 'drafts', 'POST', { donorId, kind, channel }))

  const updateDraft = (id: string, body: string) => {
    setEdits((e) => ({ ...e, [id]: body }))
    clearTimeout(pendingEdits.current.get(id)?.timer)
    pendingEdits.current.set(id, { body, timer: window.setTimeout(() => run(() => saveEdit(id)), 600) })
  }

  // Human approval is the only path to "sent"; the server logs the interaction.
  const approveDraft = (id: string) =>
    run(async () => {
      await saveEdit(id)
      return api(who, `drafts/${id}/approve`, 'POST')
    })

  const discardDraft = (id: string) =>
    run(async () => {
      clearTimeout(pendingEdits.current.get(id)?.timer)
      pendingEdits.current.delete(id)
      return api(who, `drafts/${id}/discard`, 'POST')
    })

  const logInteraction = (donorId: string, channel: Channel, summary: string) =>
    run(() => api(who, `donors/${donorId}/interactions`, 'POST', { channel, summary }))

  const setNextStep = (donorId: string, nextStep: Donor['nextStep']) =>
    run(() => api(who, `donors/${donorId}/next-step`, 'PUT', nextStep ?? {}))

  const reassign = (donorId: string, ownerId: string) =>
    run(() => api(who, `donors/${donorId}/owner`, 'PUT', { ownerId }))

  const importRows = (rows: RawDonorRow[]) =>
    run(() => api<{ created: number; merged: number; clusters: number }>(who, 'import', 'POST', { rows }))

  const setSession = (s: Session) => setWho(s.role === 'admin' ? 'admin' : s.memberId)

  return {
    ...data, drafts, setSession, member,
    createDraft, updateDraft, approveDraft, discardDraft, logInteraction, setNextStep, reassign, importRows,
  }
}

type Store = ReturnType<typeof useStoreState>
const Ctx = createContext<Store | null>(null)

function Loaded({ data, who, setWho, reload, children }: {
  data: Bootstrap; who: string; setWho: (w: string) => void; reload: () => Promise<void>; children: ReactNode
}) {
  return <Ctx.Provider value={useStoreState(data, who, setWho, reload)}>{children}</Ctx.Provider>
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [who, setWho] = useState('admin')
  const [data, setData] = useState<Bootstrap | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setData(await api<Bootstrap>(who, 'bootstrap'))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server')
    }
  }, [who])

  useEffect(() => {
    reload()
  }, [reload])

  if (!data)
    return (
      <div role="status" className="p-8 text-muted-foreground">
        {error ? `Could not load donor data: ${error}` : 'Loading donor data…'}
      </div>
    )
  return <Loaded data={data} who={who} setWho={setWho} reload={reload}>{children}</Loaded>
}

export const useStore = () => useContext(Ctx)!
