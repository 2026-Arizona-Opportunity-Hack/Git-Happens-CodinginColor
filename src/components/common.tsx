import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { RetentionStatus } from '@/lib/logic'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-cic-dark pb-4">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

// A number on the dashboard. `alert` turns it red for things that need doing;
// `to` makes the whole card a link to the list behind the number.
export function Stat({ label, value, hint, to, alert }: { label: string; value: ReactNode; hint?: string; to?: string; alert?: boolean }) {
  const card = (
    <Card className={cn('h-full', alert && 'bg-red-50 ring-red-300', to && 'transition-colors hover:bg-cic-tint motion-reduce:transition-none', to && alert && 'hover:bg-red-100')}>
      <CardContent>
        <div className={cn('text-sm', alert ? 'text-red-900' : 'text-muted-foreground')}>{label}</div>
        <div className={cn('mt-1 text-3xl font-bold', alert ? 'text-red-700' : 'text-cic-dark')}>{value}</div>
        {hint && <div className={cn('mt-1 text-xs', alert ? 'text-red-900' : 'text-muted-foreground')}>{hint}</div>}
      </CardContent>
    </Card>
  )
  if (!to) return card
  return <Link to={to} className="block rounded-xl focus-visible:ring-4 focus-visible:ring-cic-green focus-visible:outline-none">{card}</Link>
}

const STATUS_STYLE: Record<RetentionStatus, string> = {
  new: 'bg-cic-tint text-cic-dark',
  increased: 'bg-cic-dark text-white',
  same: 'bg-muted text-foreground',
  decreased: 'bg-amber-100 text-amber-900',
  lapsed: 'bg-red-100 text-red-900',
  recovered: 'bg-cic-tint text-cic-dark',
  inactive: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: RetentionStatus }) {
  return <Badge className={STATUS_STYLE[status]}>{status}</Badge>
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg">{children}</h2>
}
