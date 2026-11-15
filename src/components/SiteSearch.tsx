import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, type LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { MAX_RESULTS as MAX, searchDonors, searchPages } from '@/lib/search'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

type Page = { to: string; label: string; icon: LucideIcon; keywords?: string }
type Result = { id: string; to: string; label: string; detail?: string; icon?: LucideIcon }

// A combobox over the pages this user can open, then their donors: type to
// filter, arrows to move, Enter to go. Ctrl+K or "/" (outside a text field)
// jumps to it from anywhere.
export function SiteSearch({ pages }: { pages: Page[] }) {
  const { donors, ownerName } = useStore()
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const pageResults: Result[] = searchPages(pages, query).slice(0, 4).map((p) => ({ id: `page${p.to}`, to: p.to, label: p.label, icon: p.icon }))
  const donorResults: Result[] = searchDonors(donors, query).map((d) => ({
    id: `donor-${d.id}`, to: `/donors/${d.id}`, label: d.name, detail: [d.org, ownerName(d)].filter(Boolean).join(' · '),
  }))
  const results = [...pageResults, ...donorResults]
  const shown = open && query.trim() !== ''

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (r: Result) => {
    nav(r.to)
    setQuery('')
    setOpen(false)
    input.current?.blur()
  }

  const option = (r: Result) => {
    const i = results.indexOf(r)
    const Icon = r.icon
    return (
      <div
        key={r.id}
        id={`${listId}-${r.id}`}
        role="option"
        aria-selected={i === active}
        className={cn('flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm', i === active && 'bg-sidebar-accent text-sidebar-accent-foreground')}
        onMouseEnter={() => setActive(i)}
        onMouseDown={(e) => { e.preventDefault(); go(r) }}
      >
        {Icon && <Icon className="size-4 shrink-0 text-cic-dark" aria-hidden />}
        <span className="min-w-0">
          <span className="block font-medium">{r.label}</span>
          {r.detail && <span className="block text-xs text-muted-foreground">{r.detail}</span>}
        </span>
      </div>
    )
  }

  const group = (label: string, items: Result[]) =>
    items.length > 0 && (
      <div role="group" aria-labelledby={`${listId}-${label}`}>
        <div id={`${listId}-${label}`} className="px-2 pt-1.5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
        {items.map(option)}
      </div>
    )

  return (
    <div className="relative mb-4">
      <label htmlFor={`${listId}-input`} className="sr-only">Search pages and donors</label>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={input}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && results[active] ? `${listId}-${results[active].id}` : undefined}
        aria-keyshortcuts="Control+K /"
        placeholder="Search"
        className="bg-white pl-8"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        // Late enough that a click on a result lands first.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (results.length) setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length)
          } else if (e.key === 'Enter' && shown && results[active]) {
            e.preventDefault()
            go(results[active])
          } else if (e.key === 'Escape') {
            setQuery('')
            setOpen(false)
          }
        }}
      />
      {/* Opens upward from the bottom of the sidebar, downward on phones where the sidebar is a top bar. */}
      <div
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!shown}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-96 overflow-y-auto rounded-md border bg-popover p-1 shadow-md md:top-auto md:bottom-full md:mt-0 md:mb-1"
      >
        {group('Pages', pageResults)}
        {group('Donors', donorResults)}
        {results.length === 0 && <div role="option" aria-selected={false} aria-disabled className="px-2 py-1.5 text-sm text-muted-foreground">Nothing matches "{query.trim()}"</div>}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {shown ? `${pageResults.length} ${pageResults.length === 1 ? 'page' : 'pages'}, ${donorResults.length === MAX ? `${MAX} or more` : donorResults.length} ${donorResults.length === 1 ? 'donor' : 'donors'} found` : ''}
      </p>
    </div>
  )
}
