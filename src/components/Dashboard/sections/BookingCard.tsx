import { Link } from 'react-router-dom'
import { CalendarIcon, ClockIcon, MapPinIcon } from '../../icons/Icons'
import { StatusBadge } from '../StatusBadge'
import { services } from '../../../data/services'
import { formatBookingAddress, formatBookingDate, formatEstimatedCost } from '../../../lib/bookingApi'
import type { BookingListItem } from '../../../lib/bookingApi'
import './BookingCard.css'

interface BookingCardProps {
  booking: BookingListItem
  onViewDetails: (booking: BookingListItem) => void
}

export function BookingCard({ booking, onViewDetails }: BookingCardProps) {
  const service = services.find((item) => item.id === booking.serviceSlug)
  const ServiceIcon = service?.Icon

  return (
    <div className="booking-card">
      <div className="booking-card__top">
        <span className="booking-card__icon" aria-hidden="true">
          {ServiceIcon && <ServiceIcon />}
        </span>
        <div className="booking-card__heading">
          <span className="booking-card__service">{booking.serviceName}</span>
          <span className="booking-card__ref">Booking ID: {booking.bookingRef}</span>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="booking-card__meta">
        <span className="booking-card__meta-item">
          <CalendarIcon /> {formatBookingDate(booking.bookingDate)}
        </span>
        <span className="booking-card__meta-item">
          <ClockIcon /> {booking.timeSlotLabel}
        </span>
        <span className="booking-card__meta-item booking-card__meta-item--address">
          <MapPinIcon /> {formatBookingAddress(booking)}
        </span>
      </div>

      <div className="booking-card__footer">
        <span className="booking-card__price">{formatEstimatedCost(booking.estimatedMinPrice, booking.estimatedMaxPrice)}</span>
        <div className="booking-card__actions">
          <button type="button" className="btn btn--ghost" onClick={() => onViewDetails(booking)}>
            View Details
          </button>
          <Link to={`/track/${booking.id}`} className="btn btn--primary">
            View Tracking
          </Link>
        </div>
      </div>
    </div>
  )
}
