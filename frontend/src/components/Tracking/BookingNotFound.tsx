import { NavLink } from 'react-router-dom'
import { CalendarIcon } from '../icons/Icons'
import '../ServiceDetailPage/ServiceDetailPage.css'

/**
 * Rendered instead of the tracking layout when the /track/:bookingId param
 * doesn't match a known booking — reuses ServiceDetailPage.css's
 * `.service-not-found` visual treatment (same "clean not-found state, not
 * a runtime error or blank screen" pattern as ServiceNotFound.tsx) rather
 * than a third copy of that layout.
 */
export function BookingNotFound() {
  return (
    <div className="service-not-found">
      <span className="service-not-found__badge" aria-hidden="true">
        <CalendarIcon />
      </span>
      <h1 className="service-not-found__heading">Booking Not Found</h1>
      <p className="service-not-found__description">
        We couldn't find this booking. It may have been removed, or the link may be incorrect.
      </p>
      <NavLink to="/dashboard" className="btn btn--primary">
        Back to My Bookings
      </NavLink>
    </div>
  )
}
