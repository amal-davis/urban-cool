import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { DashboardPageSkeleton } from '../pages/skeletons/DashboardPageSkeleton'

/**
 * Gates a route on AuthContext's session check. `loading` is only ever the
 * brief window before that initial GET /api/customer/profile/ resolves (see
 * AuthContext.tsx) — reuses the dashboard's own existing skeleton rather
 * than a second loading UI, since /dashboard was this route's only consumer
 * until /booking/:serviceId also started using it. `unauthenticated`
 * replaces the page in history (`replace`) rather than pushing Login on top
 * of it, so the browser back button from Login can't land back on a
 * still-mounted protected page.
 *
 * The attempted location travels along as router state (`from`) — LoginCard
 * reads `location.state?.from` after a successful login and returns there
 * instead of always going to /dashboard, so being redirected here mid-
 * booking doesn't strand the customer on the dashboard afterward.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <DashboardPageSkeleton />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return children
}
