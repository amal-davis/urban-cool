import type { ComponentType, SVGProps } from 'react'
import {
  AcIllustration,
  FridgeIllustration,
  MicrowaveIllustration,
  WasherIllustration,
} from '../components/icons/ApplianceIcons'
import serviceAc from '../assets/photos/service-ac.jpg'
import serviceRefrigerator from '../assets/photos/service-refrigerator.jpg'
import serviceWashingMachine from '../assets/photos/service-washing-machine.jpg'
import serviceMicrowave from '../assets/photos/service-microwave.jpg'

export interface Service {
  id: string
  /** Visible card label (compact — used on the homepage Book a Service
   *  cards and Contact/Footer's service list). */
  name: string
  /** Accessible name for the card control — fuller than `name` (e.g.
   *  "Washing Machine Service" vs "Washing Machine") so it reads
   *  unambiguously out of context. Still contains `name` as a substring, so
   *  voice-navigation ("click Washing Machine") and visible-label matching
   *  both still work. Doubles as the Services page detail section heading
   *  and the /service/:id detail page's <h1>. */
  ariaLabel: string
  /** Illustration fallback for contexts that stay icon-based on purpose —
   *  the homepage's compact Book a Service tiles, My Bookings cards, and
   *  the Tracking page's booking summary, where a photo would be too small
   *  to read well. Also `imageUrl`'s fallback wherever a photo isn't set.
   *  Optional: services fetched from the backend (see lib/servicesApi.ts)
   *  always carry a real `imageUrl` instead, so they never set this — only
   *  the icon-based contexts above (which stay sourced from the hardcoded
   *  list below) actually need it. */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>
  /** Real photo — stock photography today (see assets/photos/CREDITS.md;
   *  none of these are real Urban Cool product photos yet), swappable for
   *  genuine photography or a backend-provided URL later with no component
   *  change. Preferred over `Icon` in the larger single-image contexts:
   *  the Services page card (ServiceDetail.tsx), the /service/:id page
   *  (ServiceImage.tsx), and the Booking page's summary card. */
  imageUrl?: string
  /** Short, one-sentence value statement — the /service/:id detail page's
   *  description, directly under the service name. Previously unused
   *  ("Services page overview card" was the original intent noted here,
   *  but no page ever rendered it — grepped the whole src tree to confirm
   *  before repurposing it rather than adding a duplicate field). */
  shortDescription: string
  /** Services page detail section — a short paragraph. Mentions the common
   *  symptoms/issues in prose rather than a separate bulleted list, so the
   *  page doesn't carry two overlapping lists per service. */
  detailIntro: string
  /** Services page detail section — "What We Can Help With" bullet list
   *  (symptom/issue oriented, e.g. "Cooling-related issues"). */
  helpWith: string[]
  /** /service/:id detail page — "Services Include" checklist. Deliberately
   *  a separate list from `helpWith`: this one enumerates the concrete
   *  tasks a technician performs during the visit, not the symptoms that
   *  bring a customer to book. */
  includedServices: string[]
  /** /service/:id detail page — estimated starting price in INR. Never
   *  rendered as a final price (see `priceLabel` + the shared
   *  PRICE_DISCLAIMER below) — the real cost is only ever confirmed by the
   *  booking/service flow, not this static page. */
  startingPrice: number
  /** Upper bound of the estimated price range, paired with `startingPrice`
   *  — set only for services fetched from the backend (see
   *  lib/servicesApi.ts, which always has both bounds); the 4 hardcoded
   *  services below never set it and keep showing a single starting
   *  figure, unchanged from before this field existed. */
  estimatedPriceTo?: number
  /** Label paired with `startingPrice`. Defaults to "Starting From" (or
   *  "Estimated Cost" once `estimatedPriceTo` is set) in the UI when
   *  omitted — kept per-service (rather than hardcoded in the component) so
   *  a service could use different wording without a UI change. */
  priceLabel?: string
  /** Booking CTA label, e.g. "Book AC Service". */
  ctaLabel: string
}

/** Shared across every service's /service/:id page — the pricing rule is a
 *  site-wide policy, not something that should vary or drift per service.
 *  Exported so ServiceDetailPage (and any future booking page) can reuse
 *  the exact same wording. */
export const PRICE_DISCLAIMER =
  'Estimated price. Final cost may vary depending on the appliance condition, service requirements, parts required, and technician inspection.'

export const services: Service[] = [
  {
    id: 'ac',
    name: 'AC Service',
    ariaLabel: 'AC Service',
    Icon: AcIllustration,
    imageUrl: serviceAc,
    shortDescription: 'Complete AC care for better cooling and fresh air.',
    detailIntro:
      "From AC units that aren't cooling properly to poor airflow, water leakage, or unusual noise, our technicians handle common AC problems along with routine servicing and maintenance.",
    helpWith: ['AC inspection', 'General servicing', 'Cooling-related issues', 'Cleaning & maintenance', 'Common AC problems'],
    includedServices: [
      'Full AC Cleaning (Indoor & Outdoor)',
      'Gas Pressure Check',
      'Cooling Performance Check',
      'Water Drain Check',
      'General Inspection',
    ],
    startingPrice: 499,
    ctaLabel: 'Book AC Service',
  },
  {
    id: 'washing-machine',
    name: 'Washing Machine',
    ariaLabel: 'Washing Machine Service',
    Icon: WasherIllustration,
    imageUrl: serviceWashingMachine,
    shortDescription: 'Complete performance care to keep your washing machine running smoothly.',
    detailIntro:
      "From a washing machine that won't start to drainage issues, spinning problems, excessive vibration, or unusual noise, our technicians service and troubleshoot common washing machine problems.",
    helpWith: [
      'Washing machine inspection',
      'Drainage issues',
      'Spinning & vibration problems',
      'Noise-related issues',
      'General servicing',
    ],
    includedServices: [
      'Washing Machine Inspection',
      'Drum & Spin Check',
      'Water Inlet Check',
      'Drainage Check',
      'Noise & Vibration Inspection',
      'General Performance Check',
    ],
    startingPrice: 399,
    ctaLabel: 'Book Washing Machine Service',
  },
  {
    id: 'microwave',
    name: 'Microwave',
    ariaLabel: 'Microwave Service',
    Icon: MicrowaveIllustration,
    imageUrl: serviceMicrowave,
    shortDescription: 'Thorough inspection to keep your microwave heating safely and reliably.',
    detailIntro:
      "If your microwave isn't heating, has power-related issues, is making unusual noise, or has a door problem, our technicians can inspect it and carry out general servicing and maintenance.",
    helpWith: ['Microwave inspection', 'Heating-related issues', 'Power-related problems', 'Door-related issues', 'General maintenance'],
    includedServices: [
      'Microwave General Inspection',
      'Heating Performance Check',
      'Power & Control Check',
      'Door & Safety Inspection',
      'Internal Component Inspection',
    ],
    startingPrice: 299,
    ctaLabel: 'Book Microwave Service',
  },
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    ariaLabel: 'Refrigerator Service',
    Icon: FridgeIllustration,
    imageUrl: serviceRefrigerator,
    shortDescription: 'Reliable cooling care to keep your refrigerator running efficiently.',
    detailIntro:
      'Whether your refrigerator has stopped cooling properly, developed excessive frost, is making unusual noise, or leaking water, our technicians can inspect and service it — along with general maintenance to keep it running well.',
    helpWith: [
      'Refrigerator inspection',
      'Cooling & temperature issues',
      'Frost build-up',
      'Noise-related problems',
      'General maintenance',
    ],
    includedServices: [
      'Refrigerator General Inspection',
      'Cooling Performance Check',
      'Temperature Check',
      'Condenser & Coil Inspection',
      'Drainage Check',
      'General Service Inspection',
    ],
    startingPrice: 449,
    ctaLabel: 'Book Refrigerator Service',
  },
]
