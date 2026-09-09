import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CustomerDetailsForm } from './CustomerDetailsForm'
import { AddressForm } from './AddressForm'
import { LocationPicker } from './LocationPicker'
import { BookingDateField } from './BookingDateField'
import { BookingTimeSlotField } from './BookingTimeSlotField'
import { ComplaintDetails } from './ComplaintDetails'
import { ImageUploader } from './ImageUploader'
import { validateBookingForm, hasBookingFormErrors } from '../../lib/bookingValidation'
import type { BookingFormValues } from '../../data/booking'

type TouchedField =
  | 'fullName'
  | 'email'
  | 'houseNumber'
  | 'street'
  | 'city'
  | 'state'
  | 'pincode'
  | 'bookingDate'
  | 'bookingTime'
  | 'complaint'
type TouchedFields = Record<TouchedField, boolean>

const NO_FIELDS_TOUCHED: TouchedFields = {
  fullName: false,
  email: false,
  houseNumber: false,
  street: false,
  city: false,
  state: false,
  pincode: false,
  bookingDate: false,
  bookingTime: false,
  complaint: false,
}

interface BookingFormProps {
  values: BookingFormValues
  onChange: (values: BookingFormValues) => void
  onImageError: (message: string) => void
  /** Called only once every required field passes validation — BookingPage
   *  already holds the current `values` (it owns them via `onChange`
   *  above), so this needs no payload of its own. */
  onContinue: () => void
}

/**
 * Left column of the booking page: Customer Details, Service Address (+ map
 * location), Service Requirement, Related Images, and Continue. `values` is
 * fully controlled by BookingPage (same lifted-state shape ContactForm.tsx
 * and ProfileStep.tsx already use for their own fields) — this component
 * only owns the transient touched/error/focus concerns of validating it.
 */
export function BookingForm({ values, onChange, onImageError, onContinue }: BookingFormProps) {
  const [touched, setTouched] = useState<TouchedFields>(NO_FIELDS_TOUCHED)
  const errors = validateBookingForm(values)

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const houseRef = useRef<HTMLInputElement>(null)
  const streetRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const stateRef = useRef<HTMLSelectElement>(null)
  const pincodeRef = useRef<HTMLInputElement>(null)
  const bookingDateRef = useRef<HTMLInputElement>(null)
  const bookingTimeRef = useRef<HTMLDivElement>(null)
  const complaintRef = useRef<HTMLTextAreaElement>(null)

  function markTouched(field: TouchedField) {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({
      fullName: true,
      email: true,
      houseNumber: true,
      street: true,
      city: true,
      state: true,
      pincode: true,
      bookingDate: true,
      bookingTime: true,
      complaint: true,
    })

    if (!hasBookingFormErrors(errors)) {
      onContinue()
      return
    }

    // Focus the first invalid field, in the order it appears on the page.
    const refsInOrder: [keyof typeof errors, { current: HTMLElement | null }][] = [
      ['fullName', nameRef],
      ['email', emailRef],
      ['houseNumber', houseRef],
      ['street', streetRef],
      ['city', cityRef],
      ['state', stateRef],
      ['pincode', pincodeRef],
      ['bookingDate', bookingDateRef],
      ['bookingTime', bookingTimeRef],
      ['complaint', complaintRef],
    ]
    const firstInvalid = refsInOrder.find(([field]) => errors[field])
    firstInvalid?.[1].current?.focus()
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <CustomerDetailsForm
        values={values.customer}
        errors={errors}
        touched={{ fullName: touched.fullName, email: touched.email }}
        onChange={(customer) => onChange({ ...values, customer })}
        onBlur={markTouched}
        nameRef={nameRef}
        emailRef={emailRef}
      />

      <AddressForm
        values={values.address}
        errors={errors}
        touched={{
          houseNumber: touched.houseNumber,
          street: touched.street,
          city: touched.city,
          state: touched.state,
          pincode: touched.pincode,
        }}
        onChange={(address) => onChange({ ...values, address })}
        onBlur={markTouched}
        houseRef={houseRef}
        streetRef={streetRef}
        cityRef={cityRef}
        stateRef={stateRef}
        pincodeRef={pincodeRef}
      />

      <LocationPicker location={values.location} onLocationChange={(location) => onChange({ ...values, location })} />

      <BookingDateField
        value={values.bookingDate}
        error={errors.bookingDate}
        touched={touched.bookingDate}
        onChange={(bookingDate) => onChange({ ...values, bookingDate })}
        onBlur={() => markTouched('bookingDate')}
        inputRef={bookingDateRef}
      />

      <BookingTimeSlotField
        value={values.bookingTime}
        error={errors.bookingTime}
        touched={touched.bookingTime}
        onChange={(bookingTime) => onChange({ ...values, bookingTime })}
        onBlur={() => markTouched('bookingTime')}
        groupRef={bookingTimeRef}
      />

      <ComplaintDetails
        value={values.complaint}
        error={errors.complaint}
        touched={touched.complaint}
        onChange={(complaint) => onChange({ ...values, complaint })}
        onBlur={() => markTouched('complaint')}
        textareaRef={complaintRef}
      />

      <ImageUploader
        images={values.images}
        onChange={(images) => onChange({ ...values, images })}
        onError={onImageError}
      />

      <button type="submit" className="btn btn--accent booking-form__continue">
        Continue Booking
      </button>
    </form>
  )
}
