import { MapPinIcon } from '../icons/Icons'
import { PRICE_DISCLAIMER } from '../../data/services'
import { formatBookingAddress, formatEstimatedCost } from '../../lib/bookingApi'
import type { BookingTracking } from '../../lib/bookingApi'

interface BookingDetailsCardProps {
  tracking: BookingTracking
}

/** "Additional Booking Information" — service address and estimated
 *  starting price, placed after the live-tracking content (timeline,
 *  technician, map, chat) on both mobile and desktop, per the brief's
 *  mobile ordering. The price is explicitly an estimate (PRICE_DISCLAIMER,
 *  shared with the Service Detail and Booking pages) — never shown as a
 *  final payable total. */
export function BookingDetailsCard({ tracking }: BookingDetailsCardProps) {
  return (
    <div className="tracking-section booking-details-card">
      <h2 className="tracking-section__heading">Booking Information</h2>

      <div className="booking-details-card__row">
        <span className="booking-details-card__label">
          <MapPinIcon aria-hidden="true" /> Service Address
        </span>
        <span className="booking-details-card__value">{formatBookingAddress(tracking)}</span>
      </div>

      <div className="booking-details-card__price">
        <span className="booking-details-card__label">Estimated Starting Price</span>
        <span className="booking-details-card__price-value">
          {formatEstimatedCost(tracking.estimatedMinPrice, tracking.estimatedMaxPrice)}
        </span>
        <p className="booking-details-card__price-note">{PRICE_DISCLAIMER}</p>
      </div>
    </div>
  )
}
