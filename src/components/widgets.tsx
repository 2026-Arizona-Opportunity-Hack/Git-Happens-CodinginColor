import '@radix-ui/themes/styles.css'
import '@workos-inc/widgets/styles.css'
import type { ReactNode } from 'react'
import { WorkOsWidgets } from '@workos-inc/widgets'

// Shared root for WorkOS widgets, themed to the CIC brand. Only lazily loaded
// pages import this, so Radix's styles stay out of the main bundle.
export function Widgets({ children }: { children: ReactNode }) {
  return (
    <WorkOsWidgets theme={{ appearance: 'light', accentColor: 'green', radius: 'medium', fontFamily: 'Arial, sans-serif' }}>
      {children}
    </WorkOsWidgets>
  )
}
