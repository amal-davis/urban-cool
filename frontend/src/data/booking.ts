import { fromE164 } from '../lib/indianPhone'
import type { CustomerAddress, CustomerProfile } from '../lib/customerApi'
import type { Service } from './services'

export interface BookingCustomerDetails {
  fullName: string
  email: string
  /** Local 10-digit number — read-only in the booking form, never
   *  re-collected. */
  phone: string
}

export interface BookingAddress {
  houseNumber: string
  street: string
  city: string
  state: string
  pincode: string
}

export interface BookingLocation {
  latitude: number | null
  longitude: number | null
  /** Reverse-geocoded formatted address, when Google's Geocoder is loaded
   *  and succeeds. Purely informational — display only, never a substitute
   *  for the structured `BookingAddress` fields, and never required. */
  address: string | null
}

export interface BookingImageFile {
  id: string
  file: File
  /** Local object URL for the preview thumbnail — never sent anywhere; see
   *  ImageUploader.tsx for why these get revoked on removal/unmount. */
  previewUrl: string
}

/** Everything the booking page collects, shaped so it can go straight into
 *  a POST body once a real booking API exists (see BookingPage.tsx's
 *  handleConfirm) — `images` is the one field that can't travel as JSON
 *  as-is (it'd become a multipart FormData entry per file instead), every
 *  other field is already primitive/serializable. */
export interface BookingFormValues {
  serviceId: string
  customer: BookingCustomerDetails
  address: BookingAddress
  location: BookingLocation
  /** ISO yyyy-mm-dd, '' = not yet chosen — a plain <input type="date">
   *  (see BookingDateField.tsx). */
  bookingDate: string
  /** One of TIME_SLOTS' own `value`s (data/bookingTimeSlots.ts), '' = not
   *  yet chosen — see BookingTimeSlotField.tsx. */
  bookingTime: string
  complaint: string
  images: BookingImageFile[]
}

/** Name/Email/Mobile prefill from the real authenticated customer
 *  (/booking/:id is a ProtectedRoute — see App.tsx — so `customer` is
 *  always available by the time this runs). `savedAddress`, when the
 *  customer has one on file (lib/customerApi.ts's getAddress()), seeds the
 *  address fields too — still fully editable, never locked. Its single
 *  `addressLine` has no house/street split the way BookingAddress does, so
 *  it maps onto `houseNumber` whole, leaving `street` for the customer to
 *  add/adjust if they want to split it up. Location/complaint/images
 *  always start blank; there's nothing to reasonably prefill them from. */
export function createInitialBookingFormValues(
  service: Service,
  customer: CustomerProfile,
  savedAddress: CustomerAddress | null,
): BookingFormValues {
  return {
    serviceId: service.id,
    customer: { fullName: customer.name, email: customer.email, phone: fromE164(customer.mobileNumber) },
    address: savedAddress
      ? {
          houseNumber: savedAddress.addressLine,
          street: '',
          city: savedAddress.city,
          state: savedAddress.state,
          pincode: savedAddress.pincode,
        }
      : { houseNumber: '', street: '', city: '', state: '', pincode: '' },
    location: { latitude: null, longitude: null, address: null },
    bookingDate: '',
    bookingTime: '',
    complaint: '',
    images: [],
  }
}

/** States/UTs for the Service Address "State" field — a fixed select per
 *  the brief, not free text. */
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]
