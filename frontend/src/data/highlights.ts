import type { ComponentType, SVGProps } from 'react'
import { ClockIcon, RupeeIcon, ShieldCheckIcon } from '../components/icons/Icons'

export interface Highlight {
  id: string
  title: string
  /** One-line supporting text under the title (see the reference design —
   *  icon-screen-shot.png — for the exact wording each of these matches). */
  subtitle: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

// Three trust badges, not the previous four generic highlights — this is a
// full content/visual replacement (see ServiceHighlights.tsx), not a copy
// tweak, so the icon set changed too: ShieldCheckIcon/RupeeIcon/ClockIcon
// map directly to Verified/Pricing/On-Time, vs. the previous set's more
// general Why-Choose-Us-style points.
export const highlights: Highlight[] = [
  {
    id: 'verified-technicians',
    title: 'Verified Technicians',
    subtitle: 'Trained & Background Checked',
    Icon: ShieldCheckIcon,
  },
  {
    id: 'transparent-pricing',
    title: 'Transparent Pricing',
    subtitle: 'No Hidden Charges',
    Icon: RupeeIcon,
  },
  {
    id: 'on-time-service',
    title: 'On-Time Service',
    subtitle: 'Your Time, Our Priority',
    Icon: ClockIcon,
  },
]
