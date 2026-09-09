import { Link } from 'react-router-dom'
import { CheckCircleIcon } from '../icons/Icons'
import type { Service } from '../../data/services'

interface BookingSuccessProps {
  service: Service
  /** The real, database-backed booking's reference (e.g. "UC10001") — see
   *  BookingPage.tsx's handleConfirm, which only reaches this step after
   *  bookingApi.createBooking() actually succeeds. */
  bookingRef: string
}

/** Reached only after BookingReview's Confirm Booking has successfully
 *  created a real booking (BookingPage.tsx awaits bookingApi.createBooking()
 *  first) — never shown for a booking that doesn't actually exist. */
export function BookingSuccess({ service, bookingRef }: BookingSuccessProps) {
  return (
    <div className="booking-success">
      <span className="booking-success__icon" aria-hidden="true">
        <CheckCircleIcon />
      </span>

      <h1 className="booking-page__heading">Booking Request Submitted</h1>
      <p className="booking-success__message">Your service request has been recorded.</p>

      <div className="booking-success__service">
        <span className="booking-success__service-label">Booking ID</span>
        <span className="booking-success__service-name">{bookingRef}</span>
      </div>
      <div className="booking-success__service">
        <span className="booking-success__service-label">Service</span>
        <span className="booking-success__service-name">{service.name}</span>
      </div>

      <p className="booking-success__followup">
        Our team will review your request and contact you regarding the service.
      </p>

      <div className="booking-success__actions">
        <Link to="/" className="btn btn--ghost">
          Back to Home
        </Link>
        <Link to="/dashboard" className="btn btn--primary">
          View My Bookings
        </Link>
      </div>
    </div>
  )
}
