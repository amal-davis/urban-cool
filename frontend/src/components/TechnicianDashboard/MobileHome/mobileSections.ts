/**
 * Which sidebar nav items have an equivalent section on the mobile home,
 * and the element id to scroll to for each.
 *
 * On mobile the dashboard already contains the content those separate pages
 * hold, so following the link would take a technician off a screen built
 * for their phone and onto the desktop-shaped page instead. When this map
 * is handed to TechnicianSidebar (see its `sectionTargets` prop), a tap on
 * one of these scrolls down the page instead of navigating.
 *
 * Only mappings that are actually true belong here. `history` and `profile`
 * are deliberately absent: completed past jobs and the profile form have no
 * section on the mobile home, so those two keep navigating to their own
 * pages — scrolling somewhere merely adjacent would be worse than a page
 * change, not better.
 *
 * Keys match TechnicianSidebar's own `navItems` ids; values match the ids
 * rendered by MobileTechnicianHome.
 */
export const MOBILE_HOME_SECTIONS: Record<string, string> = {
  dashboard: 'mtech-top',
  jobs: 'mtech-today',
  upcoming: 'mtech-schedule',
  earnings: 'mtech-earnings',
  performance: 'mtech-stats',
}
