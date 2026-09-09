import { NavLink } from 'react-router-dom'
import { GridIcon } from '../icons/Icons'

interface ServiceNotFoundProps {
  /** Defaults cover the original "no such slug" case — see the two
   *  optional props below for the other states this same visual now also
   *  covers (a failed fetch, an empty services list). */
  heading?: string
  description?: string
  /** `<h1>` when this is the entire page's content (the original
   *  /service/:id and /booking/:id "not found" cases — no other heading
   *  exists on the page then); `<h2>` when it's rendered under a page that
   *  already has its own `<h1>` (ServicesPage's error/empty states, via
   *  PageHeader). */
  headingLevel?: 'h1' | 'h2'
  /** When set, renders a "Try Again" button that calls this instead of the
   *  default "View Services" link — for a failed fetch that's worth
   *  retrying, as opposed to a slug that will never resolve. */
  onRetry?: () => void
}

/**
 * Rendered instead of the detail layout when the /service/:serviceId slug
 * doesn't match any known service (typo, stale link, removed service,
 * or — now that services are backend-driven, see lib/servicesApi.ts — a
 * service that's since been deactivated) — a clean, on-brand state rather
 * than a runtime error or blank screen. Also reused, via the props above,
 * for a failed services fetch and an empty services list, so every "there's
 * nothing to show here" state across the Services/Service Detail/Booking
 * pages shares one visual rather than each inventing its own.
 */
export function ServiceNotFound({
  heading = 'Service Not Found',
  description = "We couldn't find the service you're looking for. It may have been renamed or is no longer available.",
  headingLevel: Heading = 'h1',
  onRetry,
}: ServiceNotFoundProps) {
  return (
    <div className="service-not-found">
      <span className="service-not-found__badge" aria-hidden="true">
        <GridIcon />
      </span>
      <Heading className="service-not-found__heading">{heading}</Heading>
      <p className="service-not-found__description">{description}</p>
      {onRetry ? (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try Again
        </button>
      ) : (
        <NavLink to="/services" className="btn btn--primary">
          View Services
        </NavLink>
      )}
    </div>
  )
}
