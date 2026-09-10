import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isValidIndianMobile, sanitizeMobileInput } from '../../lib/indianPhone'
import './AuthForm.css'

interface MobileNumberStepProps {
  /** Carried over so "Change number" (OtpStep) round-trips back here with
   *  the number the user already typed, instead of a blank field. */
  initialValue: string
  loading: boolean
  apiError: string | null
  /** Optional inline call-to-action rendered after apiError — Signup uses
   *  this for "…Please log in instead." -> a link to /login; Login never
   *  passes it, so its error stays plain text. */
  apiErrorAction?: { label: string; to: string }
  onSubmit: (localNumber: string) => void
  /** Copy overrides so Login and Signup can share this component instead of
   *  forking it — every default below matches Login's original copy
   *  exactly, so leaving these unset keeps Login unchanged. */
  heading?: string
  subtext?: string
  submitLabel?: string
  submitLoadingLabel?: string
  /** Extra content under the submit button — Signup's "Already have an
   *  account? Log In" link, and Login's own mirror "Don't have an account?
   *  Sign Up" link. */
  footer?: ReactNode
}

/** Step 1 — collect and validate the mobile number, then request an OTP.
 *  Shared by LoginCard and SignupCard; see MobileNumberStepProps for the
 *  copy/behavior hooks that let the two flows diverge without forking this
 *  component. */
export function MobileNumberStep({
  initialValue,
  loading,
  apiError,
  apiErrorAction,
  onSubmit,
  heading = 'Welcome to Urban Cool',
  subtext = 'Sign in to book and manage your appliance services.',
  submitLabel = 'Send OTP',
  submitLoadingLabel = 'Sending OTP…',
  footer,
}: MobileNumberStepProps) {
  const [value, setValue] = useState(initialValue)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isValid = isValidIndianMobile(value)
  const showFormatError = touched && value.length > 0 && !isValid

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(sanitizeMobileInput(event.target.value))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (!isValidIndianMobile(value)) {
      inputRef.current?.focus()
      return
    }
    onSubmit(value)
  }

  return (
    <div className="auth-form">
      <h1 className="auth-form__heading">{heading}</h1>
      <p className="auth-form__subtext">{subtext}</p>

      <form className="auth-form__fields" onSubmit={handleSubmit} noValidate>
        <div className={`form-field${showFormatError ? ' has-error' : ''}`}>
          <label htmlFor="login-phone">Mobile Number</label>
          <div className="phone-input">
            <span className="phone-input__prefix" aria-hidden="true">
              +91
            </span>
            <input
              ref={inputRef}
              id="login-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              maxLength={10}
              value={value}
              onChange={handleChange}
              onBlur={() => setTouched(true)}
              aria-invalid={showFormatError}
              aria-describedby={showFormatError ? 'login-phone-error' : undefined}
            />
          </div>
          {showFormatError && (
            <span id="login-phone-error" className="form-field__error" role="alert">
              Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.
            </span>
          )}
        </div>

        {apiError && (
          <p className="auth-form__notice auth-form__notice--error" role="alert">
            {apiError}
            {apiErrorAction && (
              <>
                {' '}
                <Link to={apiErrorAction.to} className="auth-resend__link">
                  {apiErrorAction.label}
                </Link>
              </>
            )}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={!isValid || loading}>
          {loading ? submitLoadingLabel : submitLabel}
        </button>

        {footer}
      </form>
    </div>
  )
}
