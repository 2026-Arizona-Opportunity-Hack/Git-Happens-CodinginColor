import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstallEvent extends Event {
  prompt(): Promise<void>
}

// Chrome on Android fires beforeinstallprompt once, often before React has
// mounted, so it's caught when this module loads and kept for the banner.
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallEvent
  notify()
})
addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

const KEY = 'install-prompt-dismissed'
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
// iPadOS reports itself as a Mac, so check for touch too.
const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

// A banner on phones and tablets offering to install the app. Android gets
// the browser's install dialog; iOS has no API for it, so it gets directions.
export function InstallPrompt() {
  const [, rerender] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    const l = () => rerender((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])

  if (dismissed || standalone() || !matchMedia('(pointer: coarse)').matches) return null
  if (!deferred && !ios()) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // private mode: it just shows again next visit
    }
    setDismissed(true)
  }
  // The event can only prompt once; after that the banner hides either way.
  const install = async () => {
    await deferred?.prompt()
    deferred = null
    notify()
  }

  return (
    <section aria-label="Install app" className="mb-4 flex items-center gap-3 rounded-lg border border-cic-dark/30 bg-cic-tint p-3 text-sm">
      <img src="/icon-192.png" alt="" className="size-10 rounded-md" />
      <div className="flex-1">
        <div className="font-semibold">Install CIC Donors</div>
        {deferred ? (
          <div className="text-muted-foreground">Open it from your home screen like any other app.</div>
        ) : (
          <div className="text-muted-foreground">
            Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> then <strong>Add to Home Screen</strong>.
          </div>
        )}
      </div>
      {deferred && (
        <Button size="sm" onClick={install}>
          <Download aria-hidden /> Install
        </Button>
      )}
      <button type="button" onClick={dismiss} className="rounded p-1 hover:bg-black/5" aria-label="Dismiss install banner">
        <X className="size-4" aria-hidden />
      </button>
    </section>
  )
}
