import type { RefObject } from 'react'
import { INDIAN_STATES } from '../../data/booking'
import type { BookingAddress } from '../../data/booking'
import type { BookingFormErrors } from '../../lib/bookingValidation'

type AddressField = keyof BookingAddress

interface AddressFormProps {
  values: BookingAddress
  errors: BookingFormErrors
  touched: Record<AddressField, boolean>
  onChange: (values: BookingAddress) => void
  onBlur: (field: AddressField) => void
  houseRef: RefObject<HTMLInputElement | null>
  streetRef: RefObject<HTMLInputElement | null>
  cityRef: RefObject<HTMLInputElement | null>
  stateRef: RefObject<HTMLSelectElement | null>
  pincodeRef: RefObject<HTMLInputElement | null>
}

const FIELD_TO_ERROR_KEY: Record<AddressField, keyof BookingFormErrors> = {
  houseNumber: 'houseNumber',
  street: 'street',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
}

/** House/Street/City/State/PIN — the required, structured address a
 *  technician can be dispatched from on its own, independent of whether
 *  the map location picker below it loaded successfully (see
 *  bookingValidation.ts's comment on why only these fields are required).
 *  Individually named ref props (rather than a Record<field, ref>) — same
 *  convention as CustomerDetailsForm's nameRef/emailRef. */
export function AddressForm({
  values,
  errors,
  touched,
  onChange,
  onBlur,
  houseRef,
  streetRef,
  cityRef,
  stateRef,
  pincodeRef,
}: AddressFormProps) {
  function set(field: AddressField, value: string) {
    onChange({ ...values, [field]: value })
  }

  function errorFor(field: AddressField) {
    return touched[field] ? errors[FIELD_TO_ERROR_KEY[field]] : undefined
  }

  const houseError = errorFor('houseNumber')
  const streetError = errorFor('street')
  const cityError = errorFor('city')
  const stateError = errorFor('state')
  const pincodeError = errorFor('pincode')

  return (
    <div className="booking-section">
      <h2 className="booking-section__heading">Service Address</h2>
      <p className="booking-section__hint">Where should our technician come to?</p>

      <div className={`form-field${houseError ? ' has-error' : ''}`}>
        <label htmlFor="booking-house">House / Flat / Building</label>
        <input
          ref={houseRef}
          id="booking-house"
          type="text"
          autoComplete="address-line1"
          placeholder="Enter house or building details"
          value={values.houseNumber}
          onChange={(e) => set('houseNumber', e.target.value)}
          onBlur={() => onBlur('houseNumber')}
          aria-invalid={!!houseError}
          aria-describedby={houseError ? 'booking-house-error' : undefined}
        />
        {houseError && (
          <span id="booking-house-error" className="form-field__error" role="alert">
            {houseError}
          </span>
        )}
      </div>

      <div className={`form-field${streetError ? ' has-error' : ''}`}>
        <label htmlFor="booking-street">Street / Area</label>
        <input
          ref={streetRef}
          id="booking-street"
          type="text"
          autoComplete="address-line2"
          placeholder="Enter street or area"
          value={values.street}
          onChange={(e) => set('street', e.target.value)}
          onBlur={() => onBlur('street')}
          aria-invalid={!!streetError}
          aria-describedby={streetError ? 'booking-street-error' : undefined}
        />
        {streetError && (
          <span id="booking-street-error" className="form-field__error" role="alert">
            {streetError}
          </span>
        )}
      </div>

      <div className="booking-form__row">
        <div className={`form-field${cityError ? ' has-error' : ''}`}>
          <label htmlFor="booking-city">City</label>
          <input
            ref={cityRef}
            id="booking-city"
            type="text"
            autoComplete="address-level2"
            placeholder="Enter city"
            value={values.city}
            onChange={(e) => set('city', e.target.value)}
            onBlur={() => onBlur('city')}
            aria-invalid={!!cityError}
            aria-describedby={cityError ? 'booking-city-error' : undefined}
          />
          {cityError && (
            <span id="booking-city-error" className="form-field__error" role="alert">
              {cityError}
            </span>
          )}
        </div>

        <div className={`form-field${stateError ? ' has-error' : ''}`}>
          <label htmlFor="booking-state">State</label>
          <select
            ref={stateRef}
            id="booking-state"
            autoComplete="address-level1"
            value={values.state}
            onChange={(e) => set('state', e.target.value)}
            onBlur={() => onBlur('state')}
            aria-invalid={!!stateError}
            aria-describedby={stateError ? 'booking-state-error' : undefined}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {stateError && (
            <span id="booking-state-error" className="form-field__error" role="alert">
              {stateError}
            </span>
          )}
        </div>
      </div>

      <div className={`form-field${pincodeError ? ' has-error' : ''}`}>
        <label htmlFor="booking-pincode">PIN Code</label>
        <input
          ref={pincodeRef}
          id="booking-pincode"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Enter 6-digit PIN code"
          value={values.pincode}
          onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          onBlur={() => onBlur('pincode')}
          aria-invalid={!!pincodeError}
          aria-describedby={pincodeError ? 'booking-pincode-error' : undefined}
        />
        {pincodeError && (
          <span id="booking-pincode-error" className="form-field__error" role="alert">
            {pincodeError}
          </span>
        )}
      </div>
    </div>
  )
}
