import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarIcon, HeadsetIcon, HomeIcon, UserIcon } from '../icons/Icons'
import type { DashboardSectionId } from '../Dashboard/dashboardMenuItems'
import './MobileBottomNav.css'

interface BottomNavItem {
  id: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Present = a real route (rendered as a NavLink); absent = not wired
   *  yet, same "Coming soon" pattern used everywhere else in this project
   *  (Navbar, ServiceCard, etc.). */
  to?: string
  /** NavLink's `end` — only matters for "/", which would otherwise match
   *  every route underneath it. */
  end?: boolean
  /** No dedicated /bookings route exists — My Bookings is a section inside
   *  /dashboard (see UserDashboard.tsx), which reads this same
   *  `location.state.section` shape to land directly on that section
   *  instead of defaulting to the Profile overview. Same pattern
   *  NotificationBell's "View All Bookings" link already uses. */
  state?: { section: DashboardSectionId }
}

const items: BottomNavItem[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon, to: '/', end: true },
  { id: 'bookings', label: 'Bookings', Icon: CalendarIcon, to: '/dashboard', state: { section: 'bookings' } },
  // Support routes to the Contact page — no dedicated support destination
  // exists, and Contact Us is what "get help" actually means right now.
  // Reuses the route rather than duplicating it.
  { id: 'support', label: 'Support', Icon: HeadsetIcon, to: '/contact' },
  { id: 'profile', label: 'Profile', Icon: UserIcon, to: '/dashboard' },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `mobile-bottom-nav__link${isActive ? ' is-active' : ''}`
}

/**
 * Mobile-only bottom tab bar (≤767px — see MobileBottomNav.css for why this
 * doesn't reuse the navbar's 900px breakpoint). Independent of the header's
 * hamburger/slide-in menu: that's primary site navigation (Services/Contact/
 * Login/Sign Up), this is frequent-destination app-style navigation. Both
 * stay, neither replaces the other.
 */
export function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <ul className="mobile-bottom-nav__list">
        {items.map(({ id, label, Icon, to, end, state }) => (
          <li key={id} className="mobile-bottom-nav__item">
            {to ? (
              <NavLink to={to} end={end} state={state} className={navLinkClass}>
                <Icon className="mobile-bottom-nav__icon" />
                <span className="mobile-bottom-nav__label">{label}</span>
              </NavLink>
            ) : (
              // TODO: swap for a real NavLink once this route exists.
              <button type="button" className="mobile-bottom-nav__link" title="Coming soon">
                <Icon className="mobile-bottom-nav__icon" />
                <span className="mobile-bottom-nav__label">{label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
