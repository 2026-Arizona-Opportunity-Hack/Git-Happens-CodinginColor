import '@radix-ui/themes/styles.css'
import '@workos-inc/widgets/styles.css'
import { useEffect, useRef, type ReactNode } from 'react'
import { WorkOsWidgets } from '@workos-inc/widgets'

// Shared root for WorkOS widgets, themed to the CIC brand. Only lazily loaded
// pages import this, so Radix's styles stay out of the main bundle.
export function Widgets({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  // The widgets leave their role filter unnamed and their avatars without alt
  // text, which screen readers announce badly and Lighthouse flags. Patch
  // them as they render.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const patch = () => {
      el.querySelectorAll('[data-woswidgets-element="select"]:not([aria-label])').forEach((s) => s.setAttribute('aria-label', 'Filter by role'))
      el.querySelectorAll('img:not([alt])').forEach((i) => i.setAttribute('alt', ''))
    }
    patch()
    const observer = new MutationObserver(patch)
    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={root} className="cic-widgets">
      <WorkOsWidgets theme={{ appearance: 'light', accentColor: 'green', radius: 'medium', fontFamily: 'Arial, sans-serif' }}>
        {children}
      </WorkOsWidgets>
    </div>
  )
}
