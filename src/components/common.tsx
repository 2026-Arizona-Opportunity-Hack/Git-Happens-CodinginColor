import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { RetentionStatus } from '@/lib/logic'

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

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold text-cic-dark">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
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
