import type { RefObject } from 'react'
import { BOOKING_TIME_SLOTS } from '../../data/bookingTimeSlots'

interface BookingTimeSlotFieldProps {
  /** One of BOOKING_TIME_SLOTS' own `value`s, '' = not yet chosen. */
  value: string
  error?: string
  touched: boolean
  onChange: (value: string) => void
  onBlur: () => void
  /** Lets BookingForm's own "focus the first invalid field" (submit
   *  handler) bring this into view — there's no single native input to
   *  focus here (a button group, not one field), so this ref sits on the
   *  radiogroup container itself (tabIndex={-1} makes a plain div a valid
   *  *programmatic* focus target without joining the normal tab order). */
  groupRef: RefObject<HTMLDivElement | null>
}

/** Preferred Time Slot — five 2-hour arrival windows spanning the
 *  business's actual service hours (9 AM-7 PM; see data/
 *  bookingTimeSlots.ts, which is the single place both this picker and
 *  every "what time did they book" display elsewhere read their five
 *  options/labels from). A button group, not a native <select>: there are
 *  only five options and every one of them is worth showing at a glance
 *  rather than hidden behind a dropdown, the same reasoning
 *  PaymentMethodSection's own radiogroup used to follow before that
 *  section was removed.
 *
 * onBlur fires the moment a slot is picked (not via a real blur event,
 * which a button-group has no single meaningful target for) — the same
 * "touched the instant it's interacted with" behavior a native input's
 * onBlur gives BookingDateField, just triggered by the one interaction
 * that matters here.
 */
export function BookingTimeSlotField({ value, error, touched, onChange, onBlur, groupRef }: BookingTimeSlotFieldProps) {
  return (
    <div className="booking-section">
      <h2 className="booking-section__heading">Preferred Time Slot</h2>
      <p className="booking-section__hint">Choose a 2-hour window for the technician to arrive.</p>

      <div className={`form-field${touched && error ? ' has-error' : ''}`}>
        <div
          ref={groupRef}
          tabIndex={-1}
          className="time-slot-grid"
          role="radiogroup"
          aria-label="Preferred time slot"
          aria-invalid={touched && !!error}
          aria-describedby={touched && error ? 'booking-time-error' : undefined}
        >
          {BOOKING_TIME_SLOTS.map((slot) => {
            const isSelected = slot.value === value
            return (
              <button
                key={slot.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`time-slot-option${isSelected ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(slot.value)
                  onBlur()
                }}
              >
                {slot.label}
              </button>
            )
          })}
        </div>
        {touched && error && (
          <span id="booking-time-error" className="form-field__error" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
