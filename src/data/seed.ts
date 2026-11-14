import type { BoardMember, CicEvent, Donor, Gift, Interaction } from './types'

// Fake data only. Never commit real donor PII to this repo.

export const TODAY = '2026-11-14'

export const boardMembers: BoardMember[] = [
  { id: 'bm1', name: 'Alex Rivera', email: 'alex@example.org' },
  { id: 'bm2', name: 'Priya Natarajan', email: 'priya@example.org' },
  { id: 'bm3', name: 'Jordan Ellis', email: 'jordan@example.org' },
  { id: 'bm4', name: 'Sam Okafor', email: 'sam@example.org' },
]

export const events: CicEvent[] = [
  { id: 'ev1', name: 'Giving Tuesday', date: '2026-12-01' },
  { id: 'ev2', name: 'Day of Compute', date: '2026-12-05' },
  { id: 'ev3', name: 'AI Academy Showcase', date: '2027-01-23' },
  { id: 'ev4', name: 'AZ Gives Day', date: '2027-04-06' },
  { id: 'ev5', name: 'Summer Camp Kickoff', date: '2027-06-07' },
]

export const donors: Donor[] = [
  { id: 'd1', name: 'Microsoft TechSpark', org: 'Microsoft', email: 'techspark@example.com', ownerId: 'bm1', sources: ['spreadsheet'], lastTouchAt: '2026-10-02', nextStep: { text: 'Send AI Academy mid-year outcomes', due: '2026-11-20' } },
  { id: 'd2', name: 'APS Foundation', org: 'APS', email: 'grants@example.com', ownerId: 'bm2', sources: ['spreadsheet'], lastTouchAt: '2026-06-11', nextStep: { text: 'Renewal application draft', due: '2026-11-12' } },
  { id: 'd3', name: 'SRP', org: 'SRP', email: 'community@example.com', ownerId: 'bm3', sources: ['spreadsheet'], lastTouchAt: '2026-09-15' },
  { id: 'd4', name: 'Verizon Foundation', org: 'Verizon', email: 'vzf@example.com', ownerId: 'bm4', sources: ['spreadsheet'], lastTouchAt: '2026-03-30', nextStep: { text: 'Invite to Day of Compute', due: '2026-11-25', eventId: 'ev2' } },
  { id: 'd5', name: 'Maria Lopez', email: 'maria.lopez@example.com', phone: '602-555-0141', ownerId: 'bm1', sources: ['zeffy', 'spreadsheet'], lastTouchAt: '2026-08-01' },
  { id: 'd6', name: 'Kevin Tran', email: 'ktran@example.com', org: 'Intel', ownerId: 'bm2', sources: ['benevity'], lastTouchAt: '2025-12-10' },
  { id: 'd7', name: 'Aisha Bello', email: 'aisha.b@example.com', phone: '480-555-0199', ownerId: 'bm3', sources: ['zeffy'], lastTouchAt: '2026-11-08', nextStep: { text: 'Coffee — still learning the mission', due: '2026-11-18' } },
  { id: 'd8', name: 'Daniel Ortiz', email: 'dortiz@example.com', ownerId: 'bm4', sources: ['azgives'], lastTouchAt: '2026-04-08' },
  { id: 'd9', name: 'Hannah Kim', email: 'hkim@example.com', ownerId: 'bm1', sources: ['zeffy'], lastTouchAt: '2026-11-02' },
  { id: 'd10', name: 'Luis Garcia', phone: '602-555-0177', ownerId: 'bm2', sources: ['spreadsheet'] },
  { id: 'd11', name: 'Emily Chen', email: 'echen@example.com', org: 'Wells Fargo', ownerId: 'bm3', sources: ['benevity', 'unitedway'], lastTouchAt: '2026-07-19' },
  { id: 'd12', name: 'Marcus Johnson', email: 'mj@example.com', ownerId: 'bm4', sources: ['zeffy'], lastTouchAt: '2025-11-30' },
]

let gid = 0
const g = (donorId: string, amount: number, date: string, source: Gift['source'], program: Gift['program']): Gift =>
  ({ id: `g${++gid}`, donorId, amount, date, source, program })

export const gifts: Gift[] = [
  g('d1', 50000, '2024-03-01', 'spreadsheet', 'AI Academy'),
  g('d1', 60000, '2025-03-01', 'spreadsheet', 'AI Academy'),
  g('d1', 75000, '2026-03-01', 'spreadsheet', 'AI Academy'),
  g('d2', 25000, '2024-09-01', 'spreadsheet', 'K12'),
  g('d2', 25000, '2025-09-01', 'spreadsheet', 'K12'),
  g('d3', 15000, '2025-05-01', 'spreadsheet', 'Summer Camp'),
  g('d3', 10000, '2026-05-01', 'spreadsheet', 'Summer Camp'),
  g('d4', 20000, '2025-01-15', 'spreadsheet', 'Day of Compute'),
  g('d4', 20000, '2026-01-15', 'spreadsheet', 'Day of Compute'),
  g('d5', 50, '2024-12-03', 'zeffy', 'General'),
  g('d5', 100, '2025-12-02', 'zeffy', 'General'),
  g('d5', 150, '2026-04-02', 'azgives', 'Summer Camp'),
  g('d6', 500, '2024-06-30', 'benevity', 'General'),
  g('d6', 500, '2025-06-30', 'benevity', 'General'),
  g('d7', 250, '2026-09-10', 'zeffy', 'AI Academy'),
  g('d8', 75, '2025-04-08', 'azgives', 'General'),
  g('d8', 75, '2026-04-08', 'azgives', 'General'),
  g('d9', 1000, '2026-10-28', 'zeffy', 'K12'),
  g('d10', 200, '2023-12-01', 'spreadsheet', 'General'),
  g('d10', 300, '2026-02-14', 'spreadsheet', 'General'),
  g('d11', 1200, '2025-07-01', 'benevity', 'K12'),
  g('d11', 800, '2026-07-01', 'unitedway', 'K12'),
  g('d12', 100, '2025-11-28', 'zeffy', 'General'),
]

export const interactions: Interaction[] = [
  { id: 'i1', donorId: 'd1', byId: 'bm1', channel: 'email', date: '2026-10-02', summary: 'Sent Q3 program update + photos from Maryvale cohort.' },
  { id: 'i2', donorId: 'd2', byId: 'bm2', channel: 'call', date: '2026-06-11', summary: 'Program officer wants learning-gain numbers in renewal.' },
  { id: 'i3', donorId: 'd5', byId: 'bm1', channel: 'text', date: '2026-08-01', summary: 'Thanked for AZ Gives gift.' },
  { id: 'i4', donorId: 'd7', byId: 'bm3', channel: 'in-person', date: '2026-11-08', summary: 'Met at ASU event. Not ready to give more, still learning the mission.' },
  { id: 'i5', donorId: 'd9', byId: 'bm1', channel: 'email', date: '2026-11-02', summary: 'Thank-you for first gift.' },
]
