// Reuses the same real service photos data/services.ts already imports for
// the Book a Service tiles (see assets/photos/CREDITS.md for license/
// photographer) — the hero used to show its own isolated product renders
// (hero-ac.webp etc.), but the new full-bleed photographic hero design
// needs a wide environment photo per slide instead, and these already
// exist, are already licensed, and match each service. The old renders are
// still on disk (unreferenced now) in case a dedicated hero photo set gets
// commissioned later.
import serviceAc from '../assets/photos/service-ac.jpg'
import serviceRefrigerator from '../assets/photos/service-refrigerator.jpg'
import serviceWashingMachine from '../assets/photos/service-washing-machine.jpg'
import serviceMicrowave from '../assets/photos/service-microwave.jpg'

export interface HeroSlide {
  id: string
  /** Two-line heading — first line in Ink, second in Signal Blue Deep (see
   *  HeroCarousel.css's `.hero-slide__heading-line--accent`), the same
   *  two-tone "plain + highlighted" treatment ServiceAvailability's own
   *  heading already uses (`<span class="...highlight">`), just split into
   *  two fields here since these lines render on separate rows. */
  headingLine1: string
  headingLine2: string
  /** One-line supporting copy under the heading. */
  description: string
  /** Visible button text — "Book a Service" on every slide (matches the
   *  reference design); `ctaAriaLabel` carries the per-service context
   *  instead, same compact-label/fuller-aria-label split data/services.ts's
   *  `name`/`ariaLabel` pair already uses. */
  ctaLabel: string
  ctaAriaLabel: string
  /** Full-bleed background photo for the slide (see the import comment
   *  above — these are real environment photos, not isolated renders, so
   *  they're drawn with object-fit: cover behind a light scrim the heading/
   *  copy sits on, not centered in a floating box). */
  image: string
  /** Empty on purpose: decorative once the heading/description already say
   *  what the photo shows, and the alternative (an accurate description of
   *  the exact stock photo, e.g. "an outdoor AC condenser unit") would tell
   *  screen reader users about a stock photo rather than about the
   *  service — not useful information. */
  imageAlt: string
  /** CSS object-position for the background photo. Defaults to "center" in
   *  HeroCarousel.tsx when omitted. Only the washing machine photo needs an
   *  override: it's a portrait-orientation shot (see CREDITS.md) and
   *  cropping it to a wide landscape band with the default center position
   *  cuts off the appliance itself, which sits in the lower half of frame. */
  imagePosition?: string
}

export const heroSlides: HeroSlide[] = [
  {
    id: 'ac',
    headingLine1: 'Comfort at',
    headingLine2: 'Your Doorstep',
    description: 'Professional AC service, repair & installation across Kochi & nearby areas.',
    ctaLabel: 'Book a Service',
    ctaAriaLabel: 'Book AC Service',
    image: serviceAc,
    imageAlt: '',
  },
  {
    id: 'refrigerator',
    headingLine1: 'Expert Care for',
    headingLine2: 'Your Refrigerator',
    description: 'Professional refrigerator repair & maintenance across Kochi & nearby areas.',
    ctaLabel: 'Book a Service',
    ctaAriaLabel: 'Book Refrigerator Service',
    image: serviceRefrigerator,
    imageAlt: '',
  },
  {
    id: 'washing-machine',
    headingLine1: 'Fast, Reliable',
    headingLine2: 'Washing Machine Care',
    description: 'Professional washing machine repair & service across Kochi & nearby areas.',
    ctaLabel: 'Book a Service',
    ctaAriaLabel: 'Book Washing Machine Service',
    image: serviceWashingMachine,
    imageAlt: '',
    imagePosition: 'center 78%',
  },
  {
    id: 'microwave',
    headingLine1: 'Reliable Repairs for',
    headingLine2: 'Your Microwave',
    description: 'Professional microwave repair & service across Kochi & nearby areas.',
    ctaLabel: 'Book a Service',
    ctaAriaLabel: 'Book Microwave Service',
    image: serviceMicrowave,
    imageAlt: '',
  },
]
