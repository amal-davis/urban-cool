import type { RefObject } from 'react'

interface BookingDateFieldProps {
  /** ISO yyyy-mm-dd, '' = not yet chosen. */
  value: string
  error?: string
  touched: boolean
  onChange: (value: string) => void
  onBlur: () => void
  inputRef: RefObject<HTMLInputElement | null>
}

/** Preferred Service Date — a plain native date input, not a time-slot
 *  picker (see data/booking.ts's BookingFormValues.bookingDate comment for
 *  why). `min` is today's date, so the browser's own picker UI can't even
 *  offer a past date — backend/bookings/serializers.py's
 *  BookingCreateSerializer.validate_booking_date is still the authoritative
 *  check, this is only a UX convenience. */
export function BookingDateField({ value, error, touched, onChange, onBlur, inputRef }: BookingDateFieldProps) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="booking-section">
      <h2 className="booking-section__heading">Preferred Service Date</h2>
      <p className="booking-section__hint">When would you like the technician to visit?</p>

      <div className={`form-field${touched && error ? ' has-error' : ''}`}>
        <label htmlFor="booking-date">Booking Date</label>
        <input
          ref={inputRef}
          id="booking-date"
          type="date"
          min={today}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={touched && !!error}
          aria-describedby={touched && error ? 'booking-date-error' : undefined}
        />
        {touched && error && (
          <span id="booking-date-error" className="form-field__error" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
