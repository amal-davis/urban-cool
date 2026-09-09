import { useState } from 'react'
import { CalendarIcon, MapPinIcon } from '../../icons/Icons'
import { Modal } from '../../Modal/Modal'
import { StatusBadge } from '../StatusBadge'
import { BookingCard } from './BookingCard'
import { formatBookingAddress, formatBookingDate, formatEstimatedCost, statusGroup } from '../../../lib/bookingApi'
import type { BookingListItem, BookingStatusGroup } from '../../../lib/bookingApi'
import './BookingsSection.css'
import './SectionCard.css'

interface BookingsSectionProps {
  bookings: BookingListItem[]
  loading: boolean
}

type FilterId = 'all' | BookingStatusGroup

const GROUP_LABELS: Record<BookingStatusGroup, string> = {
  upcoming: 'Upcoming',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const filters: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: GROUP_LABELS.upcoming },
  { id: 'in-progress', label: GROUP_LABELS['in-progress'] },
  { id: 'completed', label: GROUP_LABELS.completed },
  { id: 'cancelled', label: GROUP_LABELS.cancelled },
]

/** My Bookings — real booking history (see UserDashboard.tsx, which fetches
 *  it via lib/bookingApi.ts) with an All/status filter and a details modal
 *  per card. Read-only here: a booking's status only ever changes via the
 *  admin/technician workflow, never a customer-side mutation. */
export function BookingsSection({ bookings, loading }: BookingsSectionProps) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null)

  const visibleBookings =
    filter === 'all' ? bookings : bookings.filter((booking) => statusGroup(booking.status) === filter)
  const activeFilterLabel = filters.find((item) => item.id === filter)?.label

  if (loading) {
    return (
      <div className="section-card" role="status" aria-busy="true">
        <span className="visually-hidden">Loading bookings…</span>
        <div className="section-empty">
          <CalendarIcon />
          <p className="section-text">Loading your bookings…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="booking-filters" role="tablist" aria-label="Filter bookings by status">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`booking-filter${filter === id ? ' is-active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleBookings.length === 0 ? (
        <div className="section-card">
          <div className="section-empty">
            <CalendarIcon />
            <p className="section-text">
              No {filter === 'all' ? '' : `${activeFilterLabel?.toLowerCase()} `}bookings to show.
            </p>
          </div>
        </div>
      ) : (
        <div className="booking-list">
          {visibleBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onViewDetails={setSelectedBooking} />
          ))}
        </div>
      )}

      <Modal
        open={selectedBooking !== null}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking?.serviceName ?? 'Booking Details'}
      >
        {selectedBooking && (
          <div className="booking-detail">
            <StatusBadge status={selectedBooking.status} />
            <dl className="booking-detail__list">
              <div className="booking-detail__row">
                <dt>Booking ID</dt>
                <dd>{selectedBooking.bookingRef}</dd>
              </div>
              <div className="booking-detail__row">
                <dt>
                  <CalendarIcon /> Date
                </dt>
                <dd>{formatBookingDate(selectedBooking.bookingDate)}</dd>
              </div>
              <div className="booking-detail__row">
                <dt>
                  <MapPinIcon /> Address
                </dt>
                <dd>{formatBookingAddress(selectedBooking)}</dd>
              </div>
              <div className="booking-detail__row">
                <dt>Estimated Cost</dt>
                <dd>{formatEstimatedCost(selectedBooking.estimatedMinPrice, selectedBooking.estimatedMaxPrice)}</dd>
              </div>
            </dl>
            {/* "assigned" and every status after it means a technician has
                actually been attached — pending/confirmed haven't reached
                that step yet. */}
            {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
              <p className="booking-detail__note">Technician will be assigned soon.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
