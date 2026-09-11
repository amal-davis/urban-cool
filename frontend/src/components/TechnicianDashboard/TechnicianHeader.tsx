import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellIcon, ChevronRightIcon, HamburgerIcon, LogoutIcon, UserIcon } from '../icons/Icons'
import { NotificationBell } from './NotificationBell'
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary'
import { useTechnicianAuth } from '../../lib/TechnicianAuthContext'
import { initialsFor } from '../../lib/initials'
import { timeOfDayGreeting } from '../../lib/greeting'
import './TechnicianHeader.css'

interface TechnicianHeaderProps {
  onOpenSidebar: () => void
  /** Dashboard-only: below 1024px that page renders its own mobile home
   *  view (see MobileTechnicianHome.tsx), which opens with its own
   *  greeting banner — showing "Good Morning, Arun" a second time right
   *  here would be redundant. Every other /technician/* page leaves this
   *  unset, so the greeting keeps showing at every width like it always
   *  has (see TechnicianLayout.tsx's own doc comment on this prop). */
  hideGreetingOnMobile?: boolean
}

/**
 * Top bar of the technician app shell. The notification bell
 * (NotificationBell.tsx) is real — GET/POST /api/technician/notifications/*.
 * (There used to be an Online/Offline toggle and a "Chat with Office"
 * button here too — both removed per product request: the toggle was
 * local, frontend-only state with no backend field behind it anyway (see
 * this project's own TechnicianProfile model), and it was part of what
 * made this bar crowd out on narrow phone screens.)
 */
export function TechnicianHeader({ onOpenSidebar, hideGreetingOnMobile }: TechnicianHeaderProps) {
  const { technician, logout } = useTechnicianAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    try {
      await logout()
    } finally {
      navigate('/technician/login', { replace: true })
    }
  }

  if (!technician) return null

  return (
    <header className={`tech-header${hideGreetingOnMobile ? ' tech-header--hide-greeting-mobile' : ''}`}>
      <div className="tech-header__start">
        <button
          type="button"
          className="icon-button tech-header__menu-toggle"
          aria-label="Open menu"
          aria-controls="technician-sidebar"
          onClick={onOpenSidebar}
        >
          <HamburgerIcon />
        </button>
        <div className="tech-header__greeting">
          <h1 className="tech-header__heading">
            {timeOfDayGreeting()}, {technician.name.split(' ')[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p className="tech-header__subtext">Here&rsquo;s your work overview for today.</p>
        </div>
      </div>

      <div className="tech-header__end">
        {/* A render-time crash inside the bell (bad API data, a future
            regression, ...) degrades to a plain disabled icon instead of
            blanking the whole dashboard — see ErrorBoundary's own
            docstring: this is a safety net, not a substitute for fixing
            whatever actually broke. */}
        <ErrorBoundary
          fallback={
            <button type="button" className="icon-button" aria-label="Notifications unavailable" disabled>
              <BellIcon />
            </button>
          }
        >
          <NotificationBell />
        </ErrorBoundary>

        <div className="tech-header__profile" ref={menuRef}>
          <button
            type="button"
            className="tech-header__avatar-button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {technician.profileImageUrl ? (
              <img src={technician.profileImageUrl} alt="" className="tech-header__avatar-photo" />
            ) : (
              <span className="tech-header__avatar-initials" aria-hidden="true">
                {initialsFor(technician.name)}
              </span>
            )}
          </button>

          {menuOpen && (
            <div className="tech-header__dropdown" role="menu">
              <div className="tech-header__dropdown-identity">
                <span className="tech-header__dropdown-name">{technician.name}</span>
                <span className="tech-header__dropdown-mobile">{technician.mobileNumber}</span>
              </div>
              <Link to="/technician/profile" className="tech-header__dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <UserIcon /> View Profile <ChevronRightIcon className="tech-header__dropdown-chevron" />
              </Link>
              <button type="button" className="tech-header__dropdown-item" role="menuitem" onClick={handleLogout}>
                <LogoutIcon /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
