/**
 * The appliance illustration set used wherever a Service's `Icon` renders
 * (homepage cards, Services page, Service Detail/Booking/Tracking pages,
 * My Bookings). The homepage hero carousel used to share this same look via
 * a raw-SVG-string sibling (carouselSvg.ts) but now uses real photos
 * instead (see data/heroSlides.ts + assets/photos/CREDITS.md) — that file
 * was removed rather than left as unused dead code.
 */
import type { SVGProps } from 'react'

function illustrationBase(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: '0 0 240 240',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export function AcIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...illustrationBase(props)}>
      <rect x="58" y="86" width="124" height="52" rx="14" />
      <line x1="76" y1="102" x2="164" y2="102" />
      <line x1="76" y1="112" x2="164" y2="112" />
      <line x1="76" y1="122" x2="164" y2="122" />
      <circle cx="168" cy="94" r="3" fill="currentColor" stroke="none" />
      <path d="M76 152c6 10 10 20 6 32" />
      <path d="M104 152c6 14 8 26 2 38" />
      <path d="M132 152c4 10 4 20 -2 30" />
    </svg>
  )
}

export function FridgeIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...illustrationBase(props)}>
      <rect x="80" y="46" width="80" height="148" rx="12" />
      <line x1="80" y1="98" x2="160" y2="98" />
      <line x1="94" y1="64" x2="94" y2="82" />
      <line x1="94" y1="112" x2="94" y2="140" />
    </svg>
  )
}

export function WasherIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...illustrationBase(props)}>
      <rect x="62" y="52" width="116" height="136" rx="14" />
      <circle cx="120" cy="128" r="38" />
      <circle cx="120" cy="128" r="26" />
      <line x1="80" y1="70" x2="92" y2="70" />
      <line x1="102" y1="70" x2="114" y2="70" />
    </svg>
  )
}

export function MicrowaveIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...illustrationBase(props)}>
      <rect x="48" y="78" width="144" height="84" rx="10" />
      <rect x="60" y="90" width="88" height="60" rx="6" />
      <circle cx="104" cy="120" r="16" />
      <line x1="168" y1="94" x2="180" y2="94" />
      <line x1="168" y1="108" x2="180" y2="108" />
      <circle cx="174" cy="128" r="6" />
    </svg>
  )
}
