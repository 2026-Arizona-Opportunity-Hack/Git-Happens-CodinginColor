import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function Logo() {
  return (
    <div aria-hidden className="flex size-8 items-center justify-center rounded-md bg-cic-dark text-sm font-bold text-white">
      C<span className="text-cic-green">i</span>C
    </div>
  )
}

// Rows of a table while its data loads.
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex gap-4 border-b bg-muted/50 px-4 py-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="ml-auto h-4 w-1/6" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
          <Skeleton className="h-4" style={{ width: `${30 - (i % 3) * 5}%` }} />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </Card>
  )
}

// Stands in for a page while its code or data loads: header, stat cards, a table.
export function PageSkeleton({ label = 'Loading page…' }: { label?: string }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div className="mb-6 border-b-2 border-cic-dark/20 pb-4">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="mt-8 mb-3 h-6 w-48" />
      <TableSkeleton />
    </div>
  )
}

// The whole app's frame — sidebar and a page — before anything has loaded,
// so the real layout drops in where the placeholders were.
export function AppSkeleton({ label }: { label: string }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside aria-hidden className="border-b border-sidebar-border bg-sidebar p-4 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="mb-6 flex items-center gap-2">
          <Logo />
          <div className="leading-tight">
            <div className="font-bold text-cic-dark">Coding in Color</div>
            <div className="text-xs text-muted-foreground">Donor Relationships</div>
          </div>
        </div>
        <div className="flex gap-2 overflow-hidden md:flex-col">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-2 px-3 py-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-20 md:w-28" />
            </div>
          ))}
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl min-w-0 p-4 md:p-8">
        <PageSkeleton label={label} />
      </main>
    </div>
  )
}
