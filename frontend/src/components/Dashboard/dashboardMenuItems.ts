import type { ComponentType, SVGProps } from 'react'
import { HeadsetIcon, InfoIcon, MapPinIcon, CalendarIcon, SettingsIcon, ShieldCheckIcon } from '../icons/Icons'

/** The dashboard's own routing-within-a-page vocabulary — see
 *  UserDashboard.tsx for how `activeSection` drives both the desktop
 *  sidebar+panel layout and the mobile list/detail layout from one piece
 *  of state. 'profile' is deliberately not one of the `menuItems` rows
 *  below (there's no "My Profile" row in the reference layout — the
 *  profile header itself is that surface); it's only a valid
 *  DashboardSectionId so the content panel has a defined default. */
export type DashboardSectionId =
  | 'profile'
  | 'address'
  | 'bookings'
  | 'support'
  | 'about'
  | 'privacy'
  | 'settings'

export interface DashboardMenuItemConfig {
  id: Exclude<DashboardSectionId, 'profile'>
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

// Order matches the supplied mobile reference exactly.
export const dashboardMenuItems: DashboardMenuItemConfig[] = [
  { id: 'address', label: 'My Address', Icon: MapPinIcon },
  { id: 'bookings', label: 'My Bookings', Icon: CalendarIcon },
  { id: 'support', label: 'Help & Support', Icon: HeadsetIcon },
  { id: 'about', label: 'About Us', Icon: InfoIcon },
  { id: 'privacy', label: 'Privacy Policy', Icon: ShieldCheckIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]
