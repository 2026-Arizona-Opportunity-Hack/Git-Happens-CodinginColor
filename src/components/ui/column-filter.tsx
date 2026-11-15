import * as React from 'react'
import { Popover } from '@base-ui/react/popover'
import { ListFilter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ColumnFilterDef, FilterValue } from '@/components/ui/filters'

// Excel-style column filters: a funnel button in a column's header opens that
// column's filter (text, a checklist of values, or a date range). DataTable
// draws these; pages only describe each column's filter in `meta.filter`.

export function ColumnFilterButton<T>({ label, def, rows, value, onChange }: {
  label: string
  def: ColumnFilterDef<T>
  rows: T[] // every row, so the checklist offers values the other filters hide too
  value: FilterValue | undefined
  onChange: (v: FilterValue | undefined) => void
}) {
  const active = value !== undefined
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Filter ${label}${active ? ' (on)' : ''}`}
        className={cn(
          'inline-flex size-6 items-center justify-center rounded hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
          active && 'bg-white text-cic-dark hover:bg-white/90',
        )}
      >
        <ListFilter className="size-3.5" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="w-64 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <Popover.Title className="mb-2 font-semibold">Filter {label}</Popover.Title>
            {def.kind === 'text' && <TextFilter label={label} placeholder={def.placeholder} value={value as string | undefined} onChange={onChange} />}
            {def.kind === 'options' && <OptionsFilter def={def} rows={rows} value={value as string[] | undefined} onChange={onChange} />}
            {def.kind === 'dateRange' && <DateFilter label={label} hint={def.hint} value={value as { from: string; to: string } | undefined} onChange={onChange} />}
            <div className="mt-3 flex justify-between gap-2 border-t pt-2">
              <Button size="sm" variant="ghost" disabled={!active} onClick={() => onChange(undefined)}>Clear</Button>
              <Popover.Close render={<Button size="sm" />}>Done</Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function TextFilter({ label, placeholder, value, onChange }: { label: string; placeholder?: string; value?: string; onChange: (v?: string) => void }) {
  return (
    <Input
      autoFocus
      aria-label={`${label} contains`}
      placeholder={placeholder ?? 'Contains…'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value.trim() ? e.target.value : undefined)}
    />
  )
}

function OptionsFilter<T>({ def, rows, value, onChange }: {
  def: Extract<ColumnFilterDef<T>, { kind: 'options' }>
  rows: T[]
  value?: string[]
  onChange: (v?: string[]) => void
}) {
  const counts = new Map<string, number>()
  for (const r of rows) for (const v of def.values(r)) counts.set(v, (counts.get(v) ?? 0) + 1)
  const all = def.order ? def.order.filter((v) => counts.has(v)) : [...counts.keys()].sort((a, b) => (def.label?.(a) ?? a).localeCompare(def.label?.(b) ?? b))
  const [q, setQ] = React.useState('')
  const shown = all.filter((v) => (def.label?.(v) ?? v).toLowerCase().includes(q.trim().toLowerCase()))
  // No value = everything ticked, as in Excel. Unticking builds the list.
  const ticked = new Set(value ?? all)
  const set = (next: Set<string>) => onChange(next.size === all.length ? undefined : all.filter((v) => next.has(v)))
  const toggle = (v: string) => { const n = new Set(ticked); if (n.has(v)) n.delete(v); else n.add(v); set(n) }
  return (
    <>
      {all.length > 8 && <Input className="mb-2" aria-label="Search values" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <label className="flex items-center gap-2 border-b py-1.5 font-medium">
        <input type="checkbox" className="size-4 accent-cic-dark" checked={ticked.size === all.length} ref={(el) => { if (el) el.indeterminate = ticked.size > 0 && ticked.size < all.length }} onChange={(e) => set(new Set(e.target.checked ? all : []))} />
        Select all
      </label>
      <ul className="max-h-56 overflow-y-auto py-1">
        {shown.map((v) => (
          <li key={v}>
            <label className="flex items-center gap-2 py-1">
              <input type="checkbox" className="size-4 accent-cic-dark" checked={ticked.has(v)} onChange={() => toggle(v)} />
              <span className="flex-1">{def.label?.(v) ?? v}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{counts.get(v)}</span>
            </label>
          </li>
        ))}
        {all.length === 0 && <li className="py-1 text-muted-foreground">No values yet.</li>}
      </ul>
    </>
  )
}

function DateFilter({ label, hint, value, onChange }: { label: string; hint?: string; value?: { from: string; to: string }; onChange: (v?: { from: string; to: string }) => void }) {
  const from = value?.from ?? ''
  const to = value?.to ?? ''
  const set = (f: string, t: string) => onChange(f || t ? { from: f, to: t } : undefined)
  return (
    <div className="grid gap-2">
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">From</span>
        <Input type="date" aria-label={`${label} from`} value={from} max={to || undefined} onChange={(e) => set(e.target.value, to)} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">To</span>
        <Input type="date" aria-label={`${label} to`} value={to} min={from || undefined} onChange={(e) => set(from, e.target.value)} />
      </label>
    </div>
  )
}

// One line above the table naming each active filter, with × to remove it.
export function ActiveFilters({ chips, shown, total, onClear }: {
  chips: { id: string; text: string; remove: () => void }[]
  shown: number
  total: number
  onClear: () => void
}) {
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2 text-sm">
      <span aria-live="polite" className="text-muted-foreground">Showing {shown} of {total}</span>
      {chips.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-cic-dark/30 bg-white py-0.5 pr-1 pl-2.5">
          {c.text}
          <button type="button" onClick={c.remove} aria-label={`Remove filter: ${c.text}`} className="rounded-full p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <Button size="sm" variant="ghost" className="h-7" onClick={onClear}>Clear all</Button>
    </div>
  )
}
