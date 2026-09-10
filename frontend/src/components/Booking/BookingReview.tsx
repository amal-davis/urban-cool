import { formatGroupedIndianMobile } from '../../lib/indianPhone'
import { PRICE_DISCLAIMER } from '../../data/services'
import { timeSlotLabel } from '../../data/bookingTimeSlots'
import type { BookingFormValues } from '../../data/booking'
import type { Service } from '../../data/services'

interface BookingReviewProps {
  service: Service
  values: BookingFormValues
  onEdit: () => void
  /** Async now — BookingPage awaits the real createBooking() call before
   *  advancing to the success step. */
  onConfirm: () => void
  submitting: boolean
  /** Server-side failure (invalid data, network, etc.) — null when there's
   *  nothing to show. */
  error: string | null
}

/**
 * Review step between the form and BookingSuccess. Confirm Booking submits
 * the real booking (see BookingPage.tsx's handleConfirm) — this component
 * itself stays presentational, same "props in, callbacks out" split as
 * BookingForm's own child components.
 */
export function BookingReview({ service, values, onEdit, onConfirm, submitting, error }: BookingReviewProps) {
  const { customer, address, location, bookingDate, bookingTime, complaint, images } = values
  const formattedAddress = `${address.houseNumber}, ${address.street}, ${address.city}, ${address.state} - ${address.pincode}`
  const formattedDate = new Date(`${bookingDate}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="booking-review">
      <h1 className="booking-page__heading">Review Your Booking</h1>
      <p className="booking-page__subtext">Please check your details before confirming your service request.</p>

      <dl className="booking-review__list">
        <div className="booking-review__row">
          <dt>Service</dt>
          <dd>{service.name}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Customer</dt>
          <dd>{customer.fullName}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Email</dt>
          <dd>{customer.email}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Mobile</dt>
          <dd>+91 {formatGroupedIndianMobile(customer.phone)}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Address</dt>
          <dd>{formattedAddress}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Preferred Date</dt>
          <dd>{formattedDate}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Preferred Time</dt>
          <dd>{timeSlotLabel(bookingTime)}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Location</dt>
          <dd>{location.latitude != null ? location.address ?? 'Selected on map' : 'Not pinned — using the address above'}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Complaint</dt>
          <dd>{complaint}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Images</dt>
          <dd>{images.length > 0 ? `${images.length} uploaded` : 'None uploaded'}</dd>
        </div>
        <div className="booking-review__row">
          <dt>Estimated Cost</dt>
          <dd className="booking-review__price">
            {service.estimatedPriceTo != null
              ? `₹${service.startingPrice.toLocaleString('en-IN')} – ₹${service.estimatedPriceTo.toLocaleString('en-IN')}`
              : `₹${service.startingPrice}`}
          </dd>
        </div>
      </dl>

      <p className="booking-review__note">{PRICE_DISCLAIMER}</p>

      {error && (
        <p className="booking-review__error" role="alert">
          {error}
        </p>
      )}

      <div className="booking-review__actions">
        <button type="button" className="btn btn--ghost" onClick={onEdit} disabled={submitting}>
          Edit Details
        </button>
        {/* Disabled while submitting (not just showing a label change) —
            prevents the double-submit a double-click could otherwise cause. */}
        <button type="button" className="btn btn--accent" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Booking…' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  )
}
