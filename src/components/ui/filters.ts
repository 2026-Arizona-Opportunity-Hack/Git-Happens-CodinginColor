import { fmtDate } from '@/lib/logic'

// How a column filters, set as `meta.filter` on a DataTable column.
// - text: rows whose text (default: the column's value) contains what's typed
// - options: a checklist of the values rows have; a row can have several
// - dateRange: rows with a date in range; `match` overrides "the column's value"
export type ColumnFilterDef<T> =
  | { kind: 'text'; text?: (row: T) => string; placeholder?: string }
  | { kind: 'options'; values: (row: T) => string[]; label?: (v: string) => string; order?: string[] }
  | { kind: 'dateRange'; match?: (row: T, from: string, to: string) => boolean; hint?: string }

export type FilterValue = string | string[] | { from: string; to: string }
export type Filters = Record<string, FilterValue> // column id -> value

type Col<T> = { id?: string; accessorKey?: unknown; accessorFn?: (row: T, i: number) => unknown; header?: unknown; meta?: { filter?: ColumnFilterDef<T> } }

export const colId = <T,>(c: Col<T>) => c.id ?? String(c.accessorKey)
export const colLabel = <T,>(c: Col<T>) => (typeof c.header === 'string' ? c.header : colId(c))

const cellText = <T,>(c: Col<T>, row: T) => {
  const v = c.accessorFn ? c.accessorFn(row, 0) : c.accessorKey ? (row as Record<string, unknown>)[String(c.accessorKey)] : undefined
  return v == null ? '' : String(v)
}

function matches<T>(c: Col<T>, def: ColumnFilterDef<T>, v: FilterValue, row: T): boolean {
  if (def.kind === 'text') return (def.text ? def.text(row) : cellText(c, row)).toLowerCase().includes(String(v).trim().toLowerCase())
  if (def.kind === 'options') { const want = v as string[]; return def.values(row).some((x) => want.includes(x)) }
  const { from, to } = v as { from: string; to: string }
  if (def.match) return def.match(row, from, to)
  const d = cellText(c, row).slice(0, 10)
  return !!d && (!from || d >= from) && (!to || d <= to)
}

// The rows every active filter lets through. Pages call it too, to export
// exactly what the table shows.
export function applyFilters<T>(rows: T[], columns: Col<T>[], filters: Filters): T[] {
  const active = columns.flatMap((c) => {
    const def = c.meta?.filter
    const v = filters[colId(c)]
    return def && v !== undefined ? [{ c, def, v }] : []
  })
  return active.length ? rows.filter((r) => active.every(({ c, def, v }) => matches(c, def, v, r))) : rows
}

// "Status: New, Lapsed", "Last gift: from Jan 1, 2026"
export function describeFilter<T>(c: Col<T>, v: FilterValue): string {
  const def = c.meta!.filter!
  const label = colLabel(c)
  if (def.kind === 'text') return `${label} contains “${String(v).trim()}”`
  if (def.kind === 'options') {
    const names = (v as string[]).map((x) => def.label?.(x) ?? x)
    return names.length === 0 ? `${label}: none` : `${label}: ${names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')}`
  }
  const { from, to } = v as { from: string; to: string }
  return `${label}: ${from && to ? `${fmtDate(from)} – ${fmtDate(to)}` : from ? `from ${fmtDate(from)}` : `until ${fmtDate(to)}`}`
}
