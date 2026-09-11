/**
 * Hand-rolled inline SVG icons. No icon library exists in this project yet
 * (checked package.json before adding any of these) — this file is the
 * single small-UI icon set. Keep it that way; don't mix in a library later
 * without migrating these too. (Separate from ApplianceIcons.tsx, which is
 * the larger illustration style used for hero slides and service cards —
 * these are compact feature/step icons, a deliberately different scale and
 * role, not an inconsistency.)
 */
import type { SVGProps } from 'react'

function base(props: SVGProps<SVGSVGElement>) {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export function HamburgerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <line x1="3.5" y1="6.5" x2="20.5" y2="6.5" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <line x1="3.5" y1="17.5" x2="20.5" y2="17.5" />
    </svg>
  )
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  )
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.25" r="3.25" />
      <path d="M4.75 19.5c1.2-3.2 4-4.75 7.25-4.75s6.05 1.55 7.25 4.75" />
    </svg>
  )
}

/** Skilled technicians (Why Choose Us); Professional Service (Trust Highlights). */
export function TechnicianIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M14.7 6.3a3 3 0 1 0-4.24 4.24l-6.4 6.4a1.5 1.5 0 0 0 2.12 2.12l6.4-6.4a3 3 0 0 0 4.24-4.24l-2.1 2.1-2.12-2.12z" />
      <path d="M14.7 6.3l2.12 2.12" />
    </svg>
  )
}

/** Doorstep service (Why Choose Us); technician home visit (How It Works); Doorstep Convenience (Trust Highlights). */
export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  )
}

/** Quick response (Why Choose Us). */
export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3.25 2" />
    </svg>
  )
}

/** Transparent service (Why Choose Us); Priority Booking (Membership banner). */
export function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.5 7 8.5 4.1-1 7-4.3 7-8.5V6l-7-2.5z" />
      <path d="M9 12.25l2 2 4-4.25" />
    </svg>
  )
}

/** Multiple appliance services (Why Choose Us); choose a service (How It Works); Multiple Appliance Categories (Trust Highlights). */
export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.75" y="3.75" width="7" height="7" rx="1.5" />
      <rect x="13.25" y="3.75" width="7" height="7" rx="1.5" />
      <rect x="3.75" y="13.25" width="7" height="7" rx="1.5" />
      <rect x="13.25" y="13.25" width="7" height="7" rx="1.5" />
    </svg>
  )
}

/** Customer focused (Why Choose Us). */
export function HeadsetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 13v-1.5a7.5 7.5 0 0 1 15 0V13" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19v.5a3 3 0 0 1-3 3h-2.5" />
    </svg>
  )
}

/** Book a service (How It Works); Easy Booking (Trust Highlights); Annual
 *  Reminders (Membership banner). */
export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.75" y="5" width="16.5" height="15" rx="2" />
      <path d="M3.75 9.5h16.5" />
      <path d="M8 3.5v3M16 3.5v3" />
      <path d="M8.5 14l2 2 4-4.25" />
    </svg>
  )
}

/** Get it serviced (How It Works). */
export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M8.75 12.25l2.25 2.25 4.25-4.75" />
    </svg>
  )
}

/** Service Availability location badge; Contact page address. */
export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s6.5-6.13 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4.87 6.5 11 6.5 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  )
}

/** Contact page phone number. */
export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 4 6.6 1.5 1.5 0 0 1 5.5 4z" />
    </svg>
  )
}

/** Contact page email address. */
export function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4.5 7l7.5 6 7.5-6" />
    </svg>
  )
}

/** Login page OTP step — "Back" to the mobile-number step. */
export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 5.5L8 12l6.5 6.5" />
    </svg>
  )
}

/** Dashboard menu rows — the trailing "go to this section" arrow; Membership
 *  banner — trailing arrow on the "View Membership" CTA. */
export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 5.5L16 12l-6.5 6.5" />
    </svg>
  )
}

/** Dashboard menu — Settings. */
export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="2.75" />
      <path d="M12 3.75v2.1M12 18.15v2.1M20.25 12h-2.1M5.85 12h-2.1M17.66 6.34l-1.48 1.48M7.82 16.18l-1.48 1.48M17.66 17.66l-1.48-1.48M7.82 7.82L6.34 6.34" />
    </svg>
  )
}

/** Dashboard menu — Payment Method. */
export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="6" width="17" height="13" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M15 14.25h2.5" />
      <path d="M7 6V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 17 5v1" />
    </svg>
  )
}

/** Dashboard menu — About Us. */
export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5.25" />
      <circle cx="12" cy="8" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

/** Add Address / add-new affordances. */
export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <line x1="12" y1="5.5" x2="12" y2="18.5" />
      <line x1="5.5" y1="12" x2="18.5" y2="12" />
    </svg>
  )
}

/** Edit Profile / Edit Address. */
export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 5.5l4 4L8 20H4v-4z" />
      <path d="M13 7l4 4" />
    </svg>
  )
}

/** Delete Address. */
export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 7.5h14" />
      <path d="M9.5 7.5V5.75A1.25 1.25 0 0 1 10.75 4.5h2.5a1.25 1.25 0 0 1 1.25 1.25V7.5" />
      <path d="M7 7.5l.75 11a1.5 1.5 0 0 0 1.5 1.4h5.5a1.5 1.5 0 0 0 1.5-1.4l.75-11" />
      <path d="M10.25 11v6M13.75 11v6" />
    </svg>
  )
}

/** Settings — Notifications toggle row. */
export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6 10.5a6 6 0 0 1 12 0v4l1.5 2.75h-15L6 14.5z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

/** Settings — sign-out action. */
export function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4h4" />
      <path d="M20 12H10.5M20 12l-3.5-3.5M20 12l-3.5 3.5" />
    </svg>
  )
}

/** Service Detail page — save/favorite toggle. Outline by default; filled
 *  via the `fill` prop override when active (see ServiceDetailTopBar). */
export function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 20s-7.5-4.6-9.9-9.3C.6 7.4 2.3 4 5.6 4c2 0 3.4 1.1 4.4 2.6C11 5.1 12.4 4 14.4 4c3.3 0 5 3.4 3.5 6.7C15.5 15.4 12 20 12 20z" />
    </svg>
  )
}

/** Technician rating (Service Tracking page). Filled by default — a rating
 *  star reads as decorative-but-meaningful, not a toggle, unlike HeartIcon
 *  above. */
export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ fill: 'currentColor', strokeWidth: 0, ...props })}>
      <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9L12 16.7l-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7L12 3.5z" strokeLinejoin="round" />
    </svg>
  )
}

/** Service Tracking page — "On The Way" timeline step. */
export function CarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 15.5l1.4-4.6a2 2 0 0 1 1.9-1.4h8.4a2 2 0 0 1 1.9 1.4l1.4 4.6" />
      <rect x="3.25" y="15.5" width="17.5" height="4" rx="1.5" />
      <circle cx="7.25" cy="19.5" r="1.25" />
      <circle cx="16.75" cy="19.5" r="1.25" />
    </svg>
  )
}

/** "Chat with Technician" CTA + chat modal header (Service Tracking page). */
export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5h16v10.5H9l-4 3.5v-3.5H4z" />
    </svg>
  )
}

/** Chat modal's message input — send button. */
export function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 12L20 4l-6 16-2.5-6.5L4 12z" strokeLinejoin="round" />
    </svg>
  )
}

/** Technician sidebar — My Jobs / Upcoming Jobs. */
export function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
      <path d="M10.5 12.5v1.5h3v-1.5" />
    </svg>
  )
}

/** Technician sidebar — Performance; Performance Summary section heading. */
export function ChartBarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
      <path d="M4 20h16" />
    </svg>
  )
}

/** Job workflow — Upload Before/After Photos step. */
export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  )
}

/** Membership banner — Exclusive Discounts. */
export function PercentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  )
}

/** Service Highlights — Transparent Pricing (the Indian Rupee sign, ₹). */
export function RupeeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M7.5 5h9" />
      <path d="M7.5 9h9" />
      <path d="M10 9c4.5 0 4.5-4.5 0-4.5h-2.5" />
      <path d="M7.5 9l8.5 10" />
    </svg>
  )
}

/** Technician mobile home — Quick Actions' "Service Report". */
export function DocumentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 3.75h8l4 4v11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1z" />
      <path d="M14.5 3.75v4h4" />
      <path d="M8.5 12.5h7M8.5 15.5h7M8.5 18h4.5" />
    </svg>
  )
}
