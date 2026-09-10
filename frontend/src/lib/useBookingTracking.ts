import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { BookingApiError, getBookingTracking } from './bookingApi'
import type { BookingTracking } from './bookingApi'

// Within the requested 10-15s range. A chained setTimeout (schedule the
// next poll only once the current one settles), not setInterval — a slow
// request can never overlap with the next tick this way.
const POLL_INTERVAL_MS = 12000

interface UseBookingTrackingResult {
  tracking: BookingTracking | null
  loading: boolean
  /** A fatal error — booking not found, unauthorized, or the very first
   *  fetch failed outright. Never set once `tracking` has already loaded
   *  once (see refreshError below for that case instead). */
  error: string | null
  /** A transient failure on a poll *after* the first successful load — the
   *  last good `tracking` is kept as-is; the UI can show this as a subtle
   *  "Unable to refresh. Retrying…" note instead of blanking the page. */
  refreshError: boolean
}

/**
 * Polls GET /api/customer/bookings/<id>/tracking/ — fetches immediately,
 * then again every ~12s, stopping once the booking reaches a terminal
 * status (completed/cancelled) or the component unmounts. This hook is the
 * one place polling lives: ServiceTrackingPage.tsx and every component
 * under it only ever consume the { tracking, loading, error, refreshError }
 * state this returns, never the interval/fetch mechanics directly — the
 * seam a future WebSocket subscription would replace without any component
 * needing to change (see this project's own note on that in
 * TrackingMap.tsx).
 *
 * An expired session (401/403 mid-poll) stops polling, clears auth state
 * via the existing AuthContext.logout() (which already tolerates an
 * already-expired session — see its own comment), and redirects to
 * /login — reusing the existing auth mechanism, not a new one.
 */
export function useBookingTracking(bookingId: number): UseBookingTrackingResult {
  const auth = useAuth()
  const navigate = useNavigate()
  const [tracking, setTracking] = useState<BookingTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState(false)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | null = null
    hasLoadedRef.current = false

    async function poll() {
      try {
        const result = await getBookingTracking(bookingId)
        if (cancelled) return
        setTracking(result)
        setError(null)
        setRefreshError(false)
        hasLoadedRef.current = true
        setLoading(false)

        // Terminal states — nothing left to poll for (see the brief's own
        // "stop polling once completed/cancelled" requirement).
        if (result.status === 'completed' || result.status === 'cancelled') return

        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
      } catch (thrown) {
        if (cancelled) return

        if (thrown instanceof BookingApiError && (thrown.status === 401 || thrown.status === 403)) {
          auth.logout().finally(() => {
            if (!cancelled) navigate('/login', { replace: true })
          })
          return
        }

        if (!hasLoadedRef.current) {
          // Never successfully loaded yet — a real, fatal error (not
          // found, network down on the very first attempt, ...), not a
          // transient refresh hiccup.
          setError(thrown instanceof BookingApiError ? thrown.message : 'Something went wrong. Please try again.')
          setLoading(false)
          return
        }

        // Already have good data on screen — keep it, just flag the
        // refresh issue and try again next interval instead of giving up.
        setRefreshError(true)
        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    poll()

    return () => {
      cancelled = true
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
    // Deliberately keyed on bookingId alone — auth/navigate are stable in
    // practice for this app's single AuthProvider/BrowserRouter, and
    // re-running this effect on every reference change would restart
    // polling (and briefly re-show the loading state) for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  return { tracking, loading, error, refreshError }
}
