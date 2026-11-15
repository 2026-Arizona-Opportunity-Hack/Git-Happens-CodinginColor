import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Donor } from '@/data/types'
import { MAX_RESULTS as MAX, searchDonors } from '@/lib/search'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

// A combobox: type to filter, arrows to move, Enter to open the donor.
// Ctrl+K or "/" (outside a text field) jumps to it from anywhere.
export function DonorSearch() {
  const { donors, ownerName } = useStore()
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const results = searchDonors(donors, query)
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

  const go = (d: Donor) => {
    nav(`/donors/${d.id}`)
    setQuery('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className="relative mb-4">
      <label htmlFor={`${listId}-input`} className="sr-only">Search donors</label>
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
        placeholder="Search donors"
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
      <ul
        id={listId}
        role="listbox"
        aria-label="Donors"
        hidden={!shown}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border bg-popover p-1 shadow-md md:top-auto md:bottom-full md:mt-0 md:mb-1"
      >
        {results.map((d, i) => (
          <li
            key={d.id}
            id={`${listId}-${d.id}`}
            role="option"
            aria-selected={i === active}
            className={cn('cursor-pointer rounded px-2 py-1.5 text-sm', i === active && 'bg-sidebar-accent text-sidebar-accent-foreground')}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => { e.preventDefault(); go(d) }}
          >
            <span className="block font-medium">{d.name}</span>
            <span className="block text-xs text-muted-foreground">{[d.org, ownerName(d)].filter(Boolean).join(' · ')}</span>
          </li>
        ))}
        {results.length === 0 && <li role="option" aria-selected={false} aria-disabled className="px-2 py-1.5 text-sm text-muted-foreground">No donors match "{query.trim()}"</li>}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {shown ? `${results.length === MAX ? `${MAX} or more` : results.length} ${results.length === 1 ? 'donor' : 'donors'} found` : ''}
      </p>
    </div>
  )
}
