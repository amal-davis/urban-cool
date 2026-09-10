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
export function TechnicianSidebar({ open, onClose }: TechnicianSidebarProps) {
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
            {navItems.map(({ id, label, to, Icon, end }) => (
              <li key={id}>
                <NavLink to={to} end={end} className={navLinkClass} onClick={onClose}>
                  <Icon className="tech-sidebar__icon" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
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
