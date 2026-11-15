import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { useDonorFilters } from '@/components/useDonorFilters'

// Filter controls for My Donors and All Donors. Pages add their own dropdowns
// with FilterSelect and pass the bar to DataTable's toolbar.
export function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const id = useId()
  return (
    <div>
      <Label htmlFor={id} className="mb-1">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function DonorFilterBar({ f, extra, active, onClear, summary }: {
  f: ReturnType<typeof useDonorFilters>
  extra?: ReactNode
  active: boolean
  onClear: () => void
  summary: string
}) {
  const id = useId()
  return (
    <div role="search" aria-label="Filter donors">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
        <div>
          <Label htmlFor={`${id}-q`} className="mb-1">Name</Label>
          <Input id={`${id}-q`} placeholder="Name, org or email" value={f.q} onChange={(e) => f.setQ(e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${id}-from`} className="mb-1">Donated from</Label>
          <Input id={`${id}-from`} type="date" value={f.from} max={f.to || undefined} onChange={(e) => f.setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${id}-to`} className="mb-1">Donated to</Label>
          <Input id={`${id}-to`} type="date" value={f.to} min={f.from || undefined} onChange={(e) => f.setTo(e.target.value)} />
        </div>
        {extra}
      </div>
      <div className="mt-3 flex min-h-8 items-center gap-3 text-sm">
        <span aria-live="polite" className="text-muted-foreground">{summary}</span>
        {active && <Button size="sm" variant="ghost" onClick={onClear}>Clear filters</Button>}
      </div>
    </div>
  )
}
