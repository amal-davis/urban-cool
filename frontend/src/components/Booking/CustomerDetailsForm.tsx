import type { RefObject } from 'react'
import { CheckCircleIcon } from '../icons/Icons'
import { formatGroupedIndianMobile } from '../../lib/indianPhone'
import type { BookingCustomerDetails } from '../../data/booking'
import type { BookingFormErrors } from '../../lib/bookingValidation'

interface CustomerDetailsFormProps {
  values: BookingCustomerDetails
  errors: BookingFormErrors
  touched: { fullName: boolean; email: boolean }
  onChange: (values: BookingCustomerDetails) => void
  onBlur: (field: 'fullName' | 'email') => void
  nameRef: RefObject<HTMLInputElement | null>
  emailRef: RefObject<HTMLInputElement | null>
}

/**
 * Full Name + Email are editable, controlled fields. Mobile Number is
 * read-only — same "already verified, don't re-ask" treatment ProfileStep
 * gives a just-verified number (AuthForm.css's `.verified-phone`), reused
 * here as its own local copy per this project's established convention of
 * not cross-importing one component's CSS into another (see
 * AuthForm.css's own comment on this).
 */
export function CustomerDetailsForm({
  values,
  errors,
  touched,
  onChange,
  onBlur,
  nameRef,
  emailRef,
}: CustomerDetailsFormProps) {
  const nameError = touched.fullName ? errors.fullName : undefined
  const emailError = touched.email ? errors.email : undefined

  return (
    <div className="booking-section">
      <h2 className="booking-section__heading">Customer Details</h2>

      <div className="verified-phone">
        <span className="verified-phone__label">Mobile Number</span>
        <span className="verified-phone__value">
          <CheckCircleIcon className="verified-phone__icon" />
          +91 {formatGroupedIndianMobile(values.phone)}
        </span>
      </div>

      <div className={`form-field${nameError ? ' has-error' : ''}`}>
        <label htmlFor="booking-name">Full Name</label>
        <input
          ref={nameRef}
          id="booking-name"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          value={values.fullName}
          onChange={(e) => onChange({ ...values, fullName: e.target.value })}
          onBlur={() => onBlur('fullName')}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'booking-name-error' : undefined}
        />
        {nameError && (
          <span id="booking-name-error" className="form-field__error" role="alert">
            {nameError}
          </span>
        )}
      </div>

      <div className={`form-field${emailError ? ' has-error' : ''}`}>
        <label htmlFor="booking-email">Email Address</label>
        <input
          ref={emailRef}
          id="booking-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          value={values.email}
          onChange={(e) => onChange({ ...values, email: e.target.value })}
          onBlur={() => onBlur('email')}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'booking-email-error' : undefined}
        />
        {emailError && (
          <span id="booking-email-error" className="form-field__error" role="alert">
            {emailError}
          </span>
        )}
      </div>
    </div>
  )
}
