import { dashboardMenuItems } from './dashboardMenuItems'
import type { DashboardSectionId } from './dashboardMenuItems'
import { DashboardMenuItem } from './DashboardMenuItem'
import './DashboardMenu.css'

interface DashboardMenuProps {
  activeSection: DashboardSectionId | null
  onSelect: (id: DashboardSectionId) => void
}

/** The six-row dashboard menu (My Address … Settings) — shared, unstyled-
 *  by-viewport list used both as the desktop sidebar's lower half and as
 *  the mobile list view; DashboardPage.css is what actually repositions/
 *  restyles the two per breakpoint, not this component. */
export function DashboardMenu({ activeSection, onSelect }: DashboardMenuProps) {
  return (
    <nav className="dashboard-menu" aria-label="Account">
      <ul className="dashboard-menu__list">
        {dashboardMenuItems.map(({ id, label, Icon }) => (
          <li key={id} className="dashboard-menu__item">
            <DashboardMenuItem
              Icon={Icon}
              label={label}
              active={activeSection === id}
              onClick={() => onSelect(id)}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}
