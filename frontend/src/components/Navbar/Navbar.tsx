import type { RefObject } from 'react'
import { NavLink } from 'react-router-dom'
import logo from '../../assets/urban-cool-logo.png'
import { useAuth } from '../../lib/AuthContext'
import { HamburgerIcon, BellIcon, UserIcon } from '../icons/Icons'
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary'
import { NotificationBell } from './NotificationBell'
import './Navbar.css'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `primary-nav__link${isActive ? ' is-active' : ''}`
}

interface NavbarProps {
  menuOpen: boolean
  onOpenMenu: () => void
  menuToggleRef: RefObject<HTMLButtonElement | null>
  menuId: string
}

export function Navbar({ menuOpen, onOpenMenu, menuToggleRef, menuId }: NavbarProps) {
  const { status } = useAuth()
  // 'loading' (the brief window before the initial session check resolves)
  // reads as signed-out here — this Navbar's only requirement is "never show
  // both states at once," and there is no third "checking..." affordance in
  // this design system to add just for that instant.
  const isAuthenticated = status === 'authenticated'

  return (
    <header className="site-header">
      <div className="site-header__bar container">
        {/* alt="" — decorative: the link's own aria-label already carries the
            accessible name ("go to homepage"), so the image doesn't need a
            second, redundant description. No adjacent text anymore; the
            logo image (icon + wordmark baked in) is the entire brand mark. */}
        <NavLink to="/" className="brand" aria-label="Urban Cool — home">
          <img src={logo} alt="" className="brand__logo" />
        </NavLink>

        <nav className="primary-nav" aria-label="Primary">
          <ul>
            <li>
              {/* end: without it, NavLink treats every route as "active"
                  underneath "/" since all paths start with it. */}
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/services" className={navLinkClass}>
                Services
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={navLinkClass}>
                Contact Us
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <NavLink to="/dashboard" className="icon-button" aria-label="Account">
              <UserIcon />
            </NavLink>
          ) : (
            <>
              <NavLink to="/login" className="btn btn--ghost">
                Log In
              </NavLink>
              <NavLink to="/signup" className="btn btn--primary">
                Sign Up
              </NavLink>
            </>
          )}
        </div>

        {/* Bell + hamburger, grouped so a single margin-left: auto (Navbar.css,
            ≤900px) can push both to the bar's right edge together — the bell
            can't live inside .header-actions above (that block is entirely
            display: none on mobile) and still stay visible there, and it
            can't carry its own auto-margin without one of the two ending up
            isolated at the far left with a huge gap (two independent
            flexbox auto-margins split the free space between them, they
            don't stay adjacent). See Navbar.css's own comment. */}
        <div className="site-header__end">
          {isAuthenticated && (
            // A render-time crash inside the bell (bad API data, a future
            // regression, ...) degrades to a plain disabled icon instead of
            // blanking the whole page — same safety net TechnicianHeader.tsx
            // already uses around its own NotificationBell.
            <ErrorBoundary
              fallback={
                <button type="button" className="icon-button" aria-label="Notifications unavailable" disabled>
                  <BellIcon />
                </button>
              }
            >
              <NotificationBell />
            </ErrorBoundary>
          )}

          <button
            ref={menuToggleRef}
            type="button"
            className="menu-toggle"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={onOpenMenu}
          >
            <HamburgerIcon />
          </button>
        </div>
      </div>
    </header>
  )
}
