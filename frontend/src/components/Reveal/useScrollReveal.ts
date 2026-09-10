import { useLayoutEffect, useRef, useState } from 'react'

type RevealState = 'default' | 'pending' | 'revealed'

/**
 * Drives a scroll-triggered fade/rise reveal, safely:
 *
 * - Starts (and stays, on first paint) at 'default' — fully visible, no
 *   transform, no opacity change. Only `useLayoutEffect`, running after
 *   mount, can ever move it to 'pending'. So if JS never runs at all (fails,
 *   blocked, a headless renderer), content simply never leaves its normal,
 *   fully-visible state — nothing is gated behind a class-triggered
 *   transition that might not fire.
 * - `prefers-reduced-motion` skips the mechanism entirely, same reason.
 *
 * Whether an element starts 'pending' (offscreen, safe to apply the
 * pre-reveal offset invisibly) or reveals immediately is decided by the
 * IntersectionObserver's own *first* callback, not a separate
 * getBoundingClientRect check — that earlier approach only asked "is this
 * already inside the exact current viewport", which said "no" for anything
 * sitting just below the fold (a tall card starting 40px under the visible
 * area, say). Those got marked 'pending' with real height reserved for
 * them, which read as a blank gap under the heading until the user
 * scrolled the small distance needed to trigger them — the actual bug
 * behind that "huge gap" report. Feeding the observer a generous bottom
 * `rootMargin` and trusting its first report (which fires with the
 * *current* intersection state, not just future changes) means anything
 * close enough to the fold to cause that problem just reveals immediately
 * instead.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [revealState, setRevealState] = useState<RevealState>('default')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let hasSeenFirstCallback = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealState('revealed')
          observer.disconnect()
        } else if (!hasSeenFirstCallback) {
          // Genuinely offscreen even with the rootMargin below — invisible
          // either way, so it's safe to apply the pre-reveal offset now.
          setRevealState('pending')
        }
        hasSeenFirstCallback = true
      },
      // Positive bottom margin: treat anything within 20% of the viewport
      // height below the fold as "in view" too, so near-fold content never
      // sits in a reserved-but-invisible state waiting to be scrolled to.
      { threshold: 0.01, rootMargin: '0px 0px 20% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, revealState }
}
