import * as React from 'react'
import {
  type ColumnDef,
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ActiveFilters, ColumnFilterButton } from '@/components/ui/column-filter'
import { applyFilters, colId, colLabel, describeFilter, type ColumnFilterDef, type Filters } from '@/components/ui/filters'
import { cn } from '@/lib/utils'

export type { ColumnDef } from '@tanstack/react-table'
export type { Filters } from '@/components/ui/filters'

declare module '@tanstack/react-table' {
  // Per-column classes, e.g. `text-right` for money, applied to header and cells.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string
    filter?: ColumnFilterDef<TData> // adds an Excel-style filter button to the header
  }
}

const PAGE_SIZES = [10, 25, 50, 100]

// The one table every page uses: CIC-dark header, striped rows, sortable
// headers (any column with an accessor) and pagination once rows pass a page.
// Columns with `meta.filter` get a filter button in their header; active
// filters are listed above the table. Pass `filters`/`onFiltersChange` to
// share filters between tables or read them (e.g. to export what's shown).
export function DataTable<T>({
  columns,
  data,
  getRowId,
  empty = 'Nothing here yet.',
  pageSize = 25,
  initialSorting = [],
  rowClassName,
  caption,
  toolbar,
  filters: filtersProp,
  onFiltersChange,
  filterRows,
  showActiveFilters = true,
}: {
  columns: ColumnDef<T, any>[]
  data: T[]
  getRowId?: (row: T) => string
  empty?: React.ReactNode
  pageSize?: number
  initialSorting?: SortingState
  rowClassName?: (row: Row<T>) => string | undefined
  caption?: string
  toolbar?: React.ReactNode
  filters?: Filters
  onFiltersChange?: (f: Filters) => void
  filterRows?: T[] // rows the checklists offer values from (default: data)
  showActiveFilters?: boolean // off for a second table sharing another's filters
}) {
  const sizeLabel = React.useId()
  const [ownFilters, setOwnFilters] = React.useState<Filters>({})
  const filters = filtersProp ?? ownFilters
  const setFilters = onFiltersChange ?? setOwnFilters
  const setFilter = (id: string, v: Filters[string] | undefined) => {
    const next = { ...filters }
    if (v === undefined) delete next[id]
    else next[id] = v
    setFilters(next)
  }
  const shownData = React.useMemo(() => applyFilters(data, columns, filters), [data, columns, filters])
  const chips = columns.flatMap((c) => {
    const id = colId(c)
    return c.meta?.filter && filters[id] !== undefined ? [{ id, text: describeFilter(c, filters[id]), remove: () => setFilter(id, undefined) }] : []
  })
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize })
  const table = useReactTable<T>({
    data: shownData,
    columns,
    getRowId: getRowId && ((row: T) => getRowId(row)),
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // A search or save changes `data`; stay on the page unless it no longer exists.
    autoResetPageIndex: false,
  })
  const pages = table.getPageCount()
  React.useEffect(() => {
    if (pagination.pageIndex > 0 && pagination.pageIndex >= pages) setPagination((p) => ({ ...p, pageIndex: Math.max(0, pages - 1) }))
  }, [pages, pagination.pageIndex])

  const total = shownData.length
  const first = pagination.pageIndex * pagination.pageSize
  const rows = table.getRowModel().rows

  return (
    <Card className="gap-0 py-0">
      {toolbar && <div className="border-b bg-muted/40 p-4">{toolbar}</div>}
      {showActiveFilters && <ActiveFilters chips={chips} shown={shownData.length} total={data.length} onClear={() => setFilters({})} />}
      <Table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="bg-cic-dark hover:bg-cic-dark">
              {hg.headers.map((h) => {
                const sorted = h.column.getIsSorted()
                const label = h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())
                const def = h.column.columnDef
                const filter = !h.isPlaceholder && def.meta?.filter && (
                  <ColumnFilterButton label={colLabel(def)} def={def.meta.filter} rows={filterRows ?? data} value={filters[h.column.id]} onChange={(v) => setFilter(h.column.id, v)} />
                )
                return (
                  <TableHead
                    key={h.id}
                    className={cn('text-white', h.column.columnDef.meta?.className)}
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                  >
                    <span className="inline-flex items-center gap-0.5">
                    {h.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                      >
                        {label}
                        {sorted === 'asc' ? <ArrowUp className="size-3.5" aria-hidden /> : sorted === 'desc' ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />}
                      </button>
                    ) : label}
                    {filter}
                    </span>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={cn('even:bg-cic-tint/60', rowClassName?.(row))}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
                {data.length > 0 && chips.length ? 'Nothing matches these filters.' : empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <nav aria-label="Table pages" className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span id={sizeLabel} className="text-muted-foreground">Rows per page</span>
            <Select
              items={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(pagination.pageSize)}
              onValueChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
            >
              <SelectTrigger aria-labelledby={sizeLabel} size="sm" className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span aria-live="polite" className="text-muted-foreground">
              {first + 1}–{Math.min(first + pagination.pageSize, total)} of {total}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
              <ChevronLeft aria-hidden />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </nav>
      )}
    </Card>
  )
}
