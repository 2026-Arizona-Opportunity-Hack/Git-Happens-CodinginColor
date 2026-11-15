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
  ownerId: string | null // null: not assigned to a board member yet
  sources: Source[]
  extra?: Record<string, string> // custom fields created while importing
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
  date: string | null // null: the import had no usable date; counts toward lifetime giving, not any year
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

export type DraftKind = 'thank-you' | 'quarterly-update' | 'lapsed-nudge' | 'follow-up' | 'event-invite'

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

// What a program achieved, for funder packets and quarterly updates. Admins
// edit it on Program outcomes; later it can come from the curriculum platform.
export interface ProgramOutcome {
  program: Program
  studentsServed: number | null
  summary: string
  updatedAt?: string
}

export interface CicEvent {
  id: string
  name: string
  date: string
}

// One committed import of one source file.
export interface ImportRecord {
  id: string
  source: Source
  fileName?: string
  rowCount: number
  importedAt: string // ISO timestamp
  importedBy: string
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
  extra?: Record<string, string> // custom columns chosen while staging
  // Why this row's gift can't be saved, for the staging warning (client only).
  giftIssue?: 'no-date' | 'bad-date' | 'bad-amount'
}
