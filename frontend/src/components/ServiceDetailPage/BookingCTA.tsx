import { Link } from 'react-router-dom'

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
 */
export function BookingCTA({ serviceId, ariaLabel }: BookingCTAProps) {
  return (
    <Link to={`/booking/${serviceId}`} className="btn btn--accent service-detail__cta" aria-label={ariaLabel}>
      Book Now
    </Link>
  )
}
