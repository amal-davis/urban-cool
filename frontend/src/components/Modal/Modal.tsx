import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { CloseIcon } from '../icons/Icons'
import './Modal.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Accessible dialog name — rendered as the visible heading too, so there
   *  isn't a separate hidden label to keep in sync with it. */
  title: string
  children: ReactNode
}

/**
 * Small generic dialog — first used by EditProfileModal and the address/
 * booking-details modals in the dashboard, but deliberately not dashboard-
 * specific itself (no dashboard imports here) so any future feature can
 * reuse it. Conditionally rendered (`open` guards a `return null`) rather
 * than always-mounted-with-CSS-visibility like MobileMenu's slide-in panel —
 * this doesn't need an off-screen resting state, so there's nothing an
 * always-mounted approach would buy here.
 *
 * Accessibility mirrors MobileMenu.tsx's proven approach in this codebase:
 * marking the rest of the page `inert` while open is the trap (nothing
 * behind the overlay is reachable) instead of a hand-rolled Tab-cycling
 * focus loop, plus the same scroll-lock + return-focus-on-close shape.
 *
 * Rendered via a portal into document.body — unlike MobileMenu (a sibling
 * of #page-root in App.tsx, so marking #page-root inert never touches it),
 * this Modal is mounted from deep inside a page's own component tree,
 * i.e. inside #page-root. Without the portal, marking #page-root inert
 * while open would inert the modal along with everything else behind it.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  // Always current without needing to be a dependency of the setup effect
  // below — see that effect's own comment for why it deliberately only
  // re-runs on `open`, not on every `onClose` identity change. Assigned in
  // an effect, not during render, so this doesn't touch a ref while
  // rendering (React discourages that even for this "latest value" idiom).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    // Covers everything under it, including the fixed-position mobile
    // bottom nav — `inert` inherits down the DOM tree regardless of a
    // descendant's own positioning, so no separate target is needed for it.
    const pageRoot = document.getElementById('page-root')
    pageRoot?.setAttribute('inert', '')

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      pageRoot?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus()
    }
    // Deliberately keyed on `open` alone (via onCloseRef above for the
    // callback) — re-running this setup effect on every render would
    // thrash the inert/scroll-lock/focus side effects for no behavioral
    // change, since they only need to happen once per open/close cycle.
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-panel__header">
          <h2 id="modal-title" className="modal-panel__title">
            {title}
          </h2>
          <button type="button" className="modal-panel__close icon-button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
