// Core domain model. The D1 schema in migrations/ stores these shapes.

export type Role = 'admin' | 'board'

export type Source = 'spreadsheet' | 'zeffy' | 'benevity' | 'azgives' | 'unitedway'

export type Program = 'K12' | 'AI Academy' | 'Summer Camp' | 'Day of Compute' | 'General'

export interface BoardMember {
  id: string
  name: string
  email: string
}

export interface Donor {
  id: string
  name: string
  email?: string
  phone?: string
  org?: string
  ownerId: string
  sources: Source[]
  nextStep?: NextStep
  lastTouchAt?: string
}

export interface NextStep {
  text: string
  due: string // ISO date
  eventId?: string
}

export interface Gift {
  id: string
  donorId: string
  amount: number
  date: string
  source: Source
  program: Program
}

export type Channel = 'email' | 'text' | 'call' | 'in-person' | 'note'

export interface Interaction {
  id: string
  donorId: string
  byId: string
  channel: Channel
  date: string
  summary: string
}

export type DraftKind = 'thank-you' | 'quarterly-update' | 'lapsed-nudge' | 'follow-up'

export interface Draft {
  id: string
  donorId: string
  kind: DraftKind
  channel: 'email' | 'text'
  body: string
  createdAt: string
  status: 'pending' | 'approved' | 'discarded'
  approvedBy?: string
}

export interface CicEvent {
  id: string
  name: string
  date: string
}

// A row as it arrives from any import source, before dedupe.
export interface RawDonorRow {
  source: Source
  name: string
  email?: string
  phone?: string
  org?: string
  amount?: number
  date?: string
  program?: Program
}
