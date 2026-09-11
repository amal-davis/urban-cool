import { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BriefcaseIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  CloseIcon,
  GridIcon,
  LogoutIcon,
  UserIcon,
  WalletIcon,
} from '../icons/Icons'
import { useTechnicianAuth } from '../../lib/TechnicianAuthContext'
import './TechnicianSidebar.css'

interface TechnicianSidebarProps {
  /** Mobile-only slide-in state — desktop ignores this entirely (see
   *  TechnicianSidebar.css's ≥1024px override) and always renders open,
   *  same "one shared markup, CSS repositions it per breakpoint" approach
   *  ProfileHeader.tsx's own comment already establishes for the customer
   *  dashboard. */
  open: boolean
  onClose: () => void
  /** Optional map of nav-item id → element id on the current page. Where a
   *  nav item has an entry, tapping it scrolls to that section and closes
   *  the drawer instead of navigating away.
   *
   *  Only the mobile technician home passes this (see MobileHome/
   *  mobileSections.ts): that one screen already holds the content the
   *  linked pages show, so navigating would drop a phone user onto the
   *  desktop-shaped version of something they're already looking at. Any
   *  page that doesn't pass it — and any nav item missing from the map —
   *  keeps navigating exactly as before. */
  sectionTargets?: Record<string, string>
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', to: '/technician/dashboard', Icon: GridIcon, end: true },
  { id: 'jobs', label: 'My Jobs', to: '/technician/jobs', Icon: BriefcaseIcon, end: false },
  { id: 'upcoming', label: 'Upcoming Jobs', to: '/technician/upcoming-jobs', Icon: CalendarIcon, end: false },
  { id: 'history', label: 'Job History', to: '/technician/job-history', Icon: ClockIcon, end: false },
  { id: 'earnings', label: 'Earnings & Commission', to: '/technician/earnings', Icon: WalletIcon, end: false },
  { id: 'performance', label: 'Performance', to: '/technician/performance', Icon: ChartBarIcon, end: false },
  { id: 'profile', label: 'Profile', to: '/technician/profile', Icon: UserIcon, end: false },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `tech-sidebar__link${isActive ? ' is-active' : ''}`
}

/**
 * App-shell sidebar — sticky/always-visible on desktop (≥1024px), an
 * off-canvas slide-in drawer with a backdrop everywhere below that (similar
 * mechanics to Navbar/MobileMenu.tsx: scroll-lock + focus-move while open,
 * Escape to close — kept as a local copy rather than a shared component
 * since MobileMenu is the *site's* nav, this is the technician portal's
 * own, and the two must never be confused). Unlike MobileMenu, this can't
 * use a plain `inert={!open}` toggle — `open` only ever tracks the mobile
 * drawer state, and blindly applying it would also make the sidebar
 * non-interactive on desktop (where it's always visible regardless of
 * `open`). TechnicianSidebar.css instead uses `visibility` — hidden
 * off-canvas on mobile when closed (removing it from focus/AT the same way
 * `inert` would), forced back to `visible` unconditionally at ≥1024px.
 */
export function TechnicianSidebar({ open, onClose, sectionTargets }: TechnicianSidebarProps) {
  const { technician, logout } = useTechnicianAuth()
  const navigate = useNavigate()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

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

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  /** Close the drawer, then scroll — in that order, and deferred past the
   *  current task. While the drawer is open the effect above holds `body {
   *  overflow: hidden }`; React flushes this click's state update and runs
   *  that cleanup only once the handler returns, so scrolling any earlier
   *  is simply discarded by the still-locked body.
   *
   *  setTimeout rather than requestAnimationFrame: rAF is tied to the
   *  rendering pipeline and never fires at all in a throttled or
   *  non-painting context, which would leave the drawer closing and nothing
   *  scrolling. A zero timer still fires in those cases and lands at the
   *  same point — after React's synchronous flush for a discrete event. */
  function scrollToSection(sectionId: string) {
    onClose()
    window.setTimeout(() => {
      const target = document.getElementById(sectionId)
      if (!target) return
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
    }, 0)
  }

  async function handleLogout() {
    onClose()
    try {
      await logout()
    } finally {
      navigate('/technician/login', { replace: true })
    }
  }

  return (
    <>
      <div className={`tech-sidebar-overlay${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        id="technician-sidebar"
        className={`tech-sidebar${open ? ' is-open' : ''}`}
        aria-label="Technician navigation"
      >
        <div className="tech-sidebar__header">
          <span className="tech-sidebar__brand">Urban Cool</span>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button tech-sidebar__close"
            aria-label="Close menu"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="tech-sidebar__nav" aria-label="Technician">
          <ul>
            {navItems.map(({ id, label, to, Icon, end }) => {
              const sectionId = sectionTargets?.[id]
              return (
                <li key={id}>
                  {/* Still a NavLink even when it scrolls: the real route
                      stays in `href`, so active-state highlighting, middle-
                      click, "open in new tab" and a no-JS fallback all keep
                      working — an ordinary left-click just handles it in
                      place instead. */}
                  <NavLink
                    to={to}
                    end={end}
                    className={navLinkClass}
                    onClick={(event) => {
                      if (!sectionId) {
                        onClose()
                        return
                      }
                      event.preventDefault()
                      scrollToSection(sectionId)
                    }}
                  >
                    <Icon className="tech-sidebar__icon" aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="tech-sidebar__footer">
          {technician && (
            <p className="tech-sidebar__specialization">
              Specialization: <strong>{technician.specialization}</strong>
            </p>
          )}
          <button type="button" className="tech-sidebar__logout" onClick={handleLogout}>
            <LogoutIcon aria-hidden="true" /> Logout
          </button>
        </div>
      </aside>
    </>
  )
}
