import type { ComponentType, SVGProps } from 'react'
import { ChevronRightIcon } from '../icons/Icons'
import './DashboardMenuItem.css'

interface DashboardMenuItemProps {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  /** Optional second line — used by SupportSection's own "More Ways to Get
   *  Help" rows (e.g. "Reach the Urban Cool team directly"); the main
   *  dashboard-menu rows (My Address, My Bookings, ...) don't pass one. */
  subtitle?: string
  /** Highlighted + aria-current — only meaningful on desktop, where the
   *  row and its content panel are visible at the same time; harmless
   *  (just never visually distinct) on mobile, where selecting a row
   *  immediately navigates away from the list. */
  active?: boolean
  onClick: () => void
}

/** One row of the dashboard menu — reused by DashboardMenu for every
 *  section (My Address, My Bookings, ...) and by SupportSection's own help
 *  rows. Deliberately a <button>, not an <a>/NavLink: these aren't distinct
 *  URLs, they're an in-page section switch (see UserDashboard.tsx's
 *  activeSection state) or a same-page action. */
export function DashboardMenuItem({ Icon, label, subtitle, active, onClick }: DashboardMenuItemProps) {
  return (
    <button
      type="button"
      className={`dashboard-menu-item${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
    >
      <span className="dashboard-menu-item__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="dashboard-menu-item__text">
        <span className="dashboard-menu-item__label">{label}</span>
        {subtitle && <span className="dashboard-menu-item__subtitle">{subtitle}</span>}
      </span>
      <ChevronRightIcon className="dashboard-menu-item__chevron" />
    </button>
  )
}
