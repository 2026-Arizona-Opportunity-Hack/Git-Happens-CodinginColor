import { PageHeader, SectionTitle } from '@/components/common'
import { Card, CardContent } from '@/components/ui/card'
import { useStore } from '@/store'
import { yearOf } from '@/lib/logic'

// Shows the read API contract with a live response computed from current
// data, so CIC's dashboard owner can see exactly what they'll get.
export default function ApiDocs() {
  const { donors, gifts, interactions, boardMembers, today } = useStore()
  const year = yearOf(today)
  const sum = <K extends string>(key: (g: (typeof gifts)[number]) => K) =>
    gifts.filter((g) => yearOf(g.date) === year).reduce<Record<string, number>>((acc, g) => ({ ...acc, [key(g)]: (acc[key(g)] ?? 0) + g.amount }), {})

  const byMember = sum((g) => donors.find((d) => d.id === g.donorId)!.ownerId)
  const response = {
    period: String(year),
    totals: {
      raised: gifts.filter((g) => yearOf(g.date) === year).reduce((s, g) => s + g.amount, 0),
      donors: donors.length,
      by_quarter: sum((g) => `Q${Math.floor((Number(g.date.slice(5, 7)) - 1) / 3) + 1}`),
      by_program: sum((g) => g.program),
      by_board_member: Object.fromEntries(boardMembers.map((m) => [m.name, byMember[m.id] ?? 0])),
    },
    recent_activity: interactions.slice(0, 3).map((i) => ({ date: i.date, channel: i.channel, board_member: boardMembers.find((m) => m.id === i.byId)?.name })),
  }

  return (
    <>
      <PageHeader title="Read API" description="Aggregated donor data for CIC's org dashboard. No donor PII leaves through this API." />
      <section className="space-y-4">
        <SectionTitle>GET /api/v1/donor-summary?period=2026</SectionTitle>
        <Card>
          <CardContent className="space-y-3 text-sm">
            <p>Authenticate with a per-integration key: <code className="rounded bg-muted px-1">Authorization: Bearer cic_live_…</code>. Keys are read-only and revocable from this page.</p>
            <p>Query params: <code>period</code> (<code>2026</code>, <code>2026-Q4</code>), optional <code>program</code>, <code>board_member</code>.</p>
            <pre className="overflow-x-auto rounded-md bg-black p-4 text-xs text-white">{JSON.stringify(response, null, 2)}</pre>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
