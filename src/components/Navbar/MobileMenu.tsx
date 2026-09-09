import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { CloseIcon, UserIcon } from '../icons/Icons'
import './MobileMenu.css'

interface MobileMenuProps {
  id: string
  open: boolean
  onClose: () => void
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `mobile-menu__link${isActive ? ' is-active' : ''}`
}

/**
 * Left slide-in mobile menu. Two `inert` toggles do the accessibility work
 * that would otherwise need a manual focus trap: the page root goes inert
 * while this is open (nothing behind the overlay is reachable), and this
 * panel goes inert while closed (its off-screen content can't be tabbed
 * into). See App.tsx for the page-root side of this.
 */
export function MobileMenu({ id, open, onClose }: MobileMenuProps) {
  const { status } = useAuth()
  const isAuthenticated = status === 'authenticated'
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Lock background scroll and move focus into the panel while open.
  useEffect(() => {
    if (!open) return

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [open])

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      <div
        className={`mobile-overlay${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        id={id}
        ref={panelRef}
        className={`mobile-menu${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        inert={!open}
      >
        <div className="mobile-menu__header">
          <span className="mobile-menu__brand">Urban Cool</span>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            aria-label="Close menu"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Mobile" className="mobile-menu__nav">
          <ul>
            <li>
              <NavLink to="/" end className={navLinkClass} onClick={onClose}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/services" className={navLinkClass} onClick={onClose}>
                Services
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={navLinkClass} onClick={onClose}>
                Contact Us
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="mobile-menu__actions">
          {isAuthenticated ? (
            <NavLink to="/dashboard" className="btn btn--ghost btn--block" onClick={onClose}>
              <UserIcon /> Account
            </NavLink>
          ) : (
            <>
              <NavLink to="/login" className="btn btn--ghost btn--block" onClick={onClose}>
                Log In
              </NavLink>
              <NavLink to="/signup" className="btn btn--primary btn--block" onClick={onClose}>
                Sign Up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </>
  )
}
