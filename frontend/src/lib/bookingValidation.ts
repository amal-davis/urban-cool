import type { BookingFormValues } from '../data/booking'
import { isValidEmail, isValidPincode } from './validation'

export interface BookingFormErrors {
  fullName?: string
  email?: string
  houseNumber?: string
  street?: string
  city?: string
  state?: string
  pincode?: string
  bookingDate?: string
  bookingTime?: string
  complaint?: string
}

/**
 * Deliberately does NOT require a map pin (`location.latitude`/`longitude`)
 * — only the structured address fields below. A technician can be
 * dispatched from house/street/city/state/PIN alone, and requiring the map
 * selection too would make the form impossible to complete whenever Google
 * Maps hasn't loaded (no API key configured, network failure, ad blocker,
 * etc.) — directly at odds with "the booking form must remain usable even
 * if the map has an initialization problem." The map pin stays a valuable,
 * optional precision add-on layered on top of the required address.
 */
export function validateBookingForm(values: BookingFormValues): BookingFormErrors {
  const errors: BookingFormErrors = {}

  if (!values.customer.fullName.trim()) {
    errors.fullName = 'Please enter your full name.'
  }

  if (!values.customer.email.trim()) {
    errors.email = 'Please enter your email address.'
  } else if (!isValidEmail(values.customer.email)) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!values.address.houseNumber.trim()) {
    errors.houseNumber = 'Please enter your house, flat, or building details.'
  }
  if (!values.address.street.trim()) {
    errors.street = 'Please enter your street or area.'
  }
  if (!values.address.city.trim()) {
    errors.city = 'Please enter your city.'
  }
  if (!values.address.state.trim()) {
    errors.state = 'Please select your state.'
  }
  if (!isValidPincode(values.address.pincode)) {
    errors.pincode = 'Please enter a valid 6-digit PIN code.'
  }

  if (!values.bookingDate) {
    errors.bookingDate = 'Please select a preferred service date.'
  } else if (values.bookingDate < new Date().toISOString().slice(0, 10)) {
    errors.bookingDate = 'Please choose a date that is today or later.'
  }

  if (!values.bookingTime) {
    errors.bookingTime = 'Please select a preferred time slot.'
  }

  if (!values.complaint.trim()) {
    errors.complaint = 'Please describe the issue you are experiencing.'
  }

  return errors
}

export function hasBookingFormErrors(errors: BookingFormErrors): boolean {
  return Object.keys(errors).length > 0
}
