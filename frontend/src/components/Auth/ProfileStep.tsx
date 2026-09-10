import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CheckCircleIcon } from '../icons/Icons'
import { formatGroupedIndianMobile } from '../../lib/indianPhone'
import { isValidEmail } from '../../lib/validation'
import './AuthForm.css'

interface ProfileStepProps {
  /** Local 10-digit number, already OTP-verified — shown read-only, never
   *  editable here (see onChangeNumber). */
  phone: string
  fullName: string
  email: string
  onFullNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  loading: boolean
  /** Page-level error (network/server) not tied to a specific field. */
  apiError: string | null
  /** Field-level error from the backend (currently only "email already
   *  registered") — kept separate from apiError so it renders under the
   *  Email field instead of as a generic banner. */
  emailApiError: string | null
  onSubmit: (fullName: string, email: string) => void
  onChangeNumber: () => void
}

/** Step 3 — only ever mounted after OTP verification succeeds (see
 *  SignupCard). Collects exactly Full Name + Email; the verified mobile
 *  number is display-only confirmation, not a re-collected field. */
export function ProfileStep({
  phone,
  fullName,
  email,
  onFullNameChange,
  onEmailChange,
  loading,
  apiError,
  emailApiError,
  onSubmit,
  onChangeNumber,
}: ProfileStepProps) {
  const [nameTouched, setNameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const trimmedName = fullName.trim()
  const trimmedEmail = email.trim()
  const isNameValid = trimmedName.length > 0
  const isEmailValid = isValidEmail(trimmedEmail)

  const nameError = nameTouched && !isNameValid ? 'Enter your full name.' : null
  const emailFormatError =
    emailTouched && trimmedEmail.length > 0 && !isEmailValid
      ? 'Enter a valid email address.'
      : emailTouched && trimmedEmail.length === 0
        ? 'Enter your email address.'
        : null
  // A stale server-side "email already registered" error clears itself the
  // moment the user edits the field again (see SignupCard's onEmailChange).
  const emailError = emailFormatError ?? emailApiError

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    onFullNameChange(event.target.value)
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    onEmailChange(event.target.value)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameTouched(true)
    setEmailTouched(true)
    if (!isNameValid) {
      nameRef.current?.focus()
      return
    }
    if (!isEmailValid) {
      emailRef.current?.focus()
      return
    }
    onSubmit(trimmedName, trimmedEmail)
  }

  return (
    <div className="auth-form">
      <h1 className="auth-form__heading">Almost there!</h1>
      <p className="auth-form__subtext">Complete your profile to create your account.</p>

      <form className="auth-form__fields" onSubmit={handleSubmit} noValidate>
        <div className="verified-phone">
          <span className="verified-phone__label">Verified Mobile Number</span>
          <span className="verified-phone__value">
            <CheckCircleIcon className="verified-phone__icon" />
            +91 {formatGroupedIndianMobile(phone)}
          </span>
          <button type="button" className="verified-phone__change" onClick={onChangeNumber}>
            Change
          </button>
        </div>

        <div className={`form-field${nameError ? ' has-error' : ''}`}>
          <label htmlFor="signup-name">Full Name</label>
          <input
            ref={nameRef}
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={handleNameChange}
            onBlur={() => setNameTouched(true)}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? 'signup-name-error' : undefined}
          />
          {nameError && (
            <span id="signup-name-error" className="form-field__error" role="alert">
              {nameError}
            </span>
          )}
        </div>

        <div className={`form-field${emailError ? ' has-error' : ''}`}>
          <label htmlFor="signup-email">Email Address</label>
          <input
            ref={emailRef}
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={handleEmailChange}
            onBlur={() => setEmailTouched(true)}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'signup-email-error' : undefined}
          />
          {emailError && (
            <span id="signup-email-error" className="form-field__error" role="alert">
              {emailError}
            </span>
          )}
        </div>

        {apiError && (
          <p className="auth-form__notice auth-form__notice--error" role="alert">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={loading || !isNameValid || !isEmailValid}
        >
          {loading ? 'Creating Account…' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
