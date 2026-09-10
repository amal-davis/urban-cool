/** Same pattern ContactForm.tsx validates email against — kept as its own
 *  small shared module (rather than importing ContactForm's local copy)
 *  since a form component's internals aren't meant to be imported by
 *  another page; this is the reusable home for it going forward. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

/** Indian PIN codes: 6 digits, first digit never 0. Shared by the booking
 *  page's Service Address form (see components/Booking/AddressForm.tsx). */
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/

export function isValidPincode(value: string): boolean {
  return PINCODE_PATTERN.test(value.trim())
}
