import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTechnicianAuth } from '../lib/TechnicianAuthContext'
import { DashboardPageSkeleton } from '../pages/skeletons/DashboardPageSkeleton'

/**
 * Gates a route on TechnicianAuthContext's session check — the technician
 * portal's own version of ProtectedRoute.tsx, checking technician auth
 * state instead of customer. `loading` reuses the customer dashboard's own
 * skeleton (visually generic enough — avatar + heading + rows — for a
 * brief loading flash rather than inventing a technician-specific one for
 * this single moment). `unauthenticated` replaces the page in history
 * (`replace`) rather than pushing Login on top of it, same reasoning as
 * ProtectedRoute.
 *
 * A signed-in *customer* visiting a technician route also lands here as
 * `unauthenticated` — TechnicianAuthContext's own check (GET /api/
 * technician/profile/) 404s for a customer session exactly like a
 * logged-out visitor (see backend/accounts/views.py's technician_profile),
 * so a customer can never reach the technician dashboard via this guard.
 */
export function TechnicianProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useTechnicianAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <DashboardPageSkeleton />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/technician/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return children
}
