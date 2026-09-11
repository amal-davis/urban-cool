import { useState } from 'react'
import type { ReactNode } from 'react'
import { TechnicianSidebar } from './TechnicianSidebar'
import { TechnicianHeader } from './TechnicianHeader'
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary'
import './TechnicianLayout.css'

interface TechnicianLayoutProps {
  children: ReactNode
  /** Passed straight through to TechnicianHeader — see that component's own
   *  prop doc comment. Only TechnicianDashboardPage sets this. */
  hideHeaderGreetingOnMobile?: boolean
  /** Passed straight through to TechnicianSidebar — see that component's
   *  own prop doc comment. Only TechnicianDashboardPage sets this, and only
   *  while its mobile home is the layout on screen. */
  sidebarSectionTargets?: Record<string, string>
}

/**
 * The technician portal's own app shell — sidebar + header + content —
 * reused by every /technician/* page except /technician/login (which stays
 * on the site's ordinary page layout, see TechnicianLoginPage.tsx). Owns
 * only the mobile sidebar's open/closed state; everything else
 * (navigation highlighting, technician identity, per-page data) lives
 * further down in TechnicianSidebar/TechnicianHeader/the page itself.
 *
 * Rendered *without* the site's own Navbar/Footer/MobileBottomNav — see
 * App.tsx's own isTechnicianPortalRoute check — so this is the only chrome
 * around any /technician/* page besides Login.
 *
 * `{children}` (the actual per-page content) is wrapped in its own
 * ErrorBoundary — a crash in one dashboard page keeps the sidebar/header
 * (and the "reload" affordance that implies) on screen instead of a blank
 * tab, same reasoning as TechnicianHeader's own boundary around
 * NotificationBell. Sidebar/header themselves stay outside it deliberately
 * — they're what a technician needs to navigate away from whatever broke.
 */
export function TechnicianLayout({
  children,
  hideHeaderGreetingOnMobile,
  sidebarSectionTargets,
}: TechnicianLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="tech-layout">
      <TechnicianSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sectionTargets={sidebarSectionTargets}
      />

      <div className="tech-layout__main">
        <TechnicianHeader onOpenSidebar={() => setSidebarOpen(true)} hideGreetingOnMobile={hideHeaderGreetingOnMobile} />
        <main className="tech-layout__content">
          <ErrorBoundary
            fallback={
              <div className="tech-empty-note" role="alert">
                Something went wrong loading this page. Please refresh, or use the sidebar to try another section.
              </div>
            }
          >
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
