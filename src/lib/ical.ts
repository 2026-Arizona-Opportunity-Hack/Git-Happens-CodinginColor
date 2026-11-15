// Just enough iCalendar (RFC 5545) to read CIC's events calendar: Google
// Calendar's "public address in iCal format" or its secret address. Each
// VEVENT becomes {uid, name, date}, with date the day it starts in Phoenix.
// Recurring events count once, on their first date.

export interface CalendarEvent { uid: string; name: string; date: string }

const TZ = 'America/Phoenix'

// "20261205" or "20261205T170000" (wall-clock in its TZID) or "...Z" (UTC).
function day(value: string): string | undefined {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return undefined
  if (!m[7]) return `${m[1]}-${m[2]}-${m[3]}`
  const utc = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]))
  return utc.toLocaleDateString('en-CA', { timeZone: TZ }) // en-CA formats as YYYY-MM-DD
}

const unescape = (v: string) => v.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? ' ' : c)).trim()

export function parseIcs(text: string): CalendarEvent[] {
  // Long lines are folded: a line break followed by a space or tab continues the line.
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const out = new Map<string, CalendarEvent>()
  let ev: Record<string, string> | undefined
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') ev = {}
    else if (line === 'END:VEVENT' && ev) {
      const date = ev.DTSTART && day(ev.DTSTART)
      // A moved occurrence of a recurring event shares the UID; the first one wins.
      if (ev.UID && ev.SUMMARY && date && ev.STATUS !== 'CANCELLED' && !ev['RECURRENCE-ID'])
        out.set(ev.UID, { uid: ev.UID, name: unescape(ev.SUMMARY).slice(0, 200), date })
      ev = undefined
    } else if (ev) {
      const colon = line.indexOf(':')
      if (colon < 0) continue
      const name = line.slice(0, colon).split(';')[0].toUpperCase()
      ev[name] ??= line.slice(colon + 1)
    }
  }
  return [...out.values()]
}
