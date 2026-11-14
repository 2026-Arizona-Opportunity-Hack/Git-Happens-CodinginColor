import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder until the prototype routes land; shows the brand tokens are wired up.
export default function App() {
  return (
    <main id="main" className="mx-auto max-w-xl p-8">
      <div className="mb-6 flex items-center gap-2">
        <div aria-hidden className="flex size-8 items-center justify-center rounded-md bg-cic-dark text-sm font-bold text-white">
          C<span className="text-cic-green">i</span>C
        </div>
        <div className="leading-tight">
          <div className="font-bold text-cic-dark">Coding in Color</div>
          <div className="text-xs text-muted-foreground">Donor Relationships</div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>App scaffold</CardTitle>
          <CardDescription>Vite + React + shadcn (Base UI) with the CIC brand theme.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
        </CardContent>
      </Card>
    </main>
  )
}
