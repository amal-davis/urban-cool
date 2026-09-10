import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './PageTransitionSpinner.css'

/**
 * A spinning-circle cue on every route change. There's nothing actually
 * loading over the network here — route swaps in this app are synchronous
 * — so like the bar this replaced, it's a visual transition cue, not a
 * real progress indicator.
 */
export function PageTransitionSpinner() {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the initial page load — there's no "previous page" to transition
    // from yet, so nothing to signal.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    setVisible(true)
    // Long enough for the spin to actually read as motion (not just a
    // flicker), short enough to stay honest about how fast the swap is.
    const timeout = setTimeout(() => setVisible(false), 550)
    return () => clearTimeout(timeout)
  }, [pathname])

  if (!visible) return null

  return (
    <div className="page-transition-spinner-wrap" aria-hidden="true">
      <div className="page-transition-spinner-badge">
        <span className="page-transition-spinner" />
      </div>
    </div>
  )
}
