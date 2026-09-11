import { Link } from 'react-router-dom'
import { CalendarIcon, ChevronRightIcon } from '../icons/Icons'

interface BookingCTAProps {
  serviceId: string
  /** Fuller accessible name, e.g. "Book AC Service" — the visible label
   *  stays the literal "Book Now" the brief specifies, same
   *  compact-label/fuller-aria-label split `services.ts`'s `name`/
   *  `ariaLabel` pair already uses elsewhere in this project. */
  ariaLabel: string
}

/**
 * Primary "Book Now" action — links to /booking/:serviceId, the same
 * service id this page itself is keyed by (see ServiceDetailPage.tsx).
 * Previously a "Coming soon" placeholder (the project's convention for a
 * destination that doesn't exist yet — ServiceCard, FinalCTA, etc.); now
 * that BookingPage.tsx exists, this is a real link like ServiceCard was
 * updated to be.
 *
 * Leading calendar glyph + trailing chevron (pushed to the far edge on the
 * full-width mobile button via .service-detail__cta-arrow) match the
 * icon+label+arrow button from the supplied reference design, reusing
 * icons already in the shared set rather than adding new ones.
 */
export function BookingCTA({ serviceId, ariaLabel }: BookingCTAProps) {
  return (
    <Link to={`/booking/${serviceId}`} className="btn btn--accent service-detail__cta" aria-label={ariaLabel}>
      <CalendarIcon aria-hidden="true" />
      <span>Book Now</span>
      <ChevronRightIcon aria-hidden="true" className="service-detail__cta-arrow" />
    </Link>
  )
}
