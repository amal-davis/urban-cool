import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tracks a CSS media query in JS — for the rare case a layout needs a
 * genuinely different component tree per viewport, not just different
 * styling of the same markup (which is what plain media queries in a .css
 * file already handle everywhere else in this project). Currently only
 * TechnicianDashboardPage needs it, to mount its mobile-only home view
 * instead of the desktop one below 1024px rather than rendering both and
 * hiding one — the hidden tree would otherwise still carry real buttons
 * and links into the tab order.
 *
 * `useSyncExternalStore` rather than useState + useEffect: matchMedia is
 * exactly the "external store" it exists for, so the first render already
 * has the right answer (no mobile-then-desktop flip on mount), the value
 * can't tear mid-render, and changing the query re-subscribes without a
 * stale-state window in between.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onStoreChange)
      return () => mediaQueryList.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}
