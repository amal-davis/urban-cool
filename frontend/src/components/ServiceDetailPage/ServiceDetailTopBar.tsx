import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, HeartIcon } from '../icons/Icons'

/**
 * Compact page-local header: Back on the left, a favorite toggle on the
 * right. Sits below the global Navbar (still rendered, unchanged, by
 * App.tsx) — this is a page-specific affordance, not a second site nav.
 *
 * Back goes to /services rather than `navigate(-1)`: this page is reachable
 * from a direct link/shared URL as easily as from in-app browsing, and a
 * history-relative back can land somewhere outside the app (or nowhere) in
 * that case. /services is always a real, predictable destination — the
 * same one ServiceNotFound's "View Services" button uses.
 *
 * Favorite has no backend/persistence yet (none exists in this project) —
 * per the brief, kept frontend-only and visually subtle (an outline heart
 * that fills in on toggle) rather than wired to real functionality.
 */
export function ServiceDetailTopBar() {
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <div className="service-detail__topbar">
      <button
        type="button"
        className="service-detail__back"
        aria-label="Back to Services"
        onClick={() => navigate('/services')}
      >
        <ChevronLeftIcon />
        <span className="service-detail__back-label">Back to Services</span>
      </button>

      <button
        type="button"
        className="service-detail__favorite icon-button"
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={() => setIsFavorite((prev) => !prev)}
      >
        <HeartIcon fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
