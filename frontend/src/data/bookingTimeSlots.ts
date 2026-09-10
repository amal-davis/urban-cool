/**
 * The five 2-hour arrival windows a customer can pick when booking a
 * service, 9 AM-7 PM — `value`/`label` mirror backend/bookings/models.py's
 * Booking.TIME_SLOT_CHOICES exactly (same keys, same order, same wording),
 * so a slot chosen here round-trips through the API unchanged and reads
 * identically everywhere it's shown back (BookingReview, the dashboard's
 * BookingCard, the tracking page, the technician dashboard's JobCard/
 * JobDetailModal). If the backend's own choices ever change, this is the
 * one frontend place to update alongside it.
 */
export interface BookingTimeSlot {
  /** The slot's stored key — its 24-hour start time (e.g. "09:00"),
   *  matching Booking.TIME_SLOT_* on the backend. */
  value: string
  label: string
}

export const BOOKING_TIME_SLOTS: BookingTimeSlot[] = [
  { value: '09:00', label: '9:00 AM - 11:00 AM' },
  { value: '11:00', label: '11:00 AM - 1:00 PM' },
  { value: '13:00', label: '1:00 PM - 3:00 PM' },
  { value: '15:00', label: '3:00 PM - 5:00 PM' },
  { value: '17:00', label: '5:00 PM - 7:00 PM' },
]

/** Looks up a slot's display label from its stored value — used wherever a
 *  booking is shown back (not just where it's picked); falls back to the
 *  raw value itself for the (should-never-happen) case of a value that
 *  isn't one of the five above, rather than showing nothing. */
export function timeSlotLabel(value: string): string {
  return BOOKING_TIME_SLOTS.find((slot) => slot.value === value)?.label ?? value
}
