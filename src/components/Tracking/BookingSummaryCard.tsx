import { CalendarIcon, ClockIcon } from '../icons/Icons'
import { services } from '../../data/services'
import { formatBookingDate } from '../../lib/bookingApi'
import type { BookingTracking } from '../../lib/bookingApi'

interface BookingSummaryCardProps {
  tracking: BookingTracking
}

/** Compact "what am I tracking" context near the top of the page — service
 *  name, booking ID, date, and time slot only. Deliberately excludes
 *  address/price (see BookingDetailsCard, rendered further down) so this
 *  stays a quick orientation glance, not a second full booking-details
 *  block. */
export function BookingSummaryCard({ tracking }: BookingSummaryCardProps) {
  // The tracking endpoint returns the service's display name, not its slug
  // (see backend/bookings/serializers.py's BookingTrackingSerializer) —
  // matching on name here is matching against
  // migrations/0003_seed_services.py's own seed, which set Service.name to
  // exactly this file's `name` field, not a guess.
  const service = services.find((item) => item.name === tracking.serviceName)

  return (
    <div className="booking-summary-card">
      <span className="booking-summary-card__icon" aria-hidden="true">
        {service?.Icon && <service.Icon />}
      </span>
      <div className="booking-summary-card__heading">
        <h2 className="booking-summary-card__service">{tracking.serviceName}</h2>
        <span className="booking-summary-card__ref">Booking ID: {tracking.bookingRef}</span>
      </div>
      <div className="booking-summary-card__schedule">
        <span>
          <CalendarIcon aria-hidden="true" /> {formatBookingDate(tracking.bookingDate)}
        </span>
        <span>
          <ClockIcon aria-hidden="true" /> {tracking.timeSlotLabel}
        </span>
      </div>
    </div>
  )
}
