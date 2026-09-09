import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../Modal/Modal'
import { OtpInput } from '../Auth/OtpInput'
import { CheckCircleIcon, ChevronLeftIcon } from '../icons/Icons'
import {
  formatGroupedIndianMobile,
  formatTimer,
  fromE164,
  isValidIndianMobile,
  sanitizeMobileInput,
} from '../../lib/indianPhone'
import { isValidEmail } from '../../lib/validation'
import { CustomerApiError, sendChangeMobileOtp, updateProfile, verifyChangeMobileOtp } from '../../lib/customerApi'
import type { CustomerProfile } from '../../lib/customerApi'
import './EditProfileModal.css'

interface EditProfileModalProps {
  open: boolean
  customer: CustomerProfile
  onClose: () => void
  /** Called after ANY successful save here — a name/email edit or a
   *  completed mobile-number change — with the fresh profile. UserDashboard
   *  forwards this straight to AuthContext.setCustomer, the one place this
   *  data actually lives, so Navbar/ProfileHeader/etc. all update together. */
  onSaved: (customer: CustomerProfile) => void
}

/**
 * Edit Profile — Name + Email, plus a "Change" link into a self-contained
 * OTP mobile-number-change flow (reuses OtpInput from the Auth flow). The
 * mobile number itself is never a plain editable field here: changing it
 * always goes through send-otp -> verify-otp, matching the task's explicit
 * "never change mobile without verification" requirement.
 */
export function EditProfileModal({ open, customer, onClose, onSaved }: EditProfileModalProps) {
  const [step, setStep] = useState<'edit' | 'mobile-phone' | 'mobile-otp'>('edit')

  function handleClose() {
    onClose()
  }

  const titles = {
    edit: 'Edit Profile',
    'mobile-phone': 'Change Mobile Number',
    'mobile-otp': 'Verify New Mobile Number',
  } as const

  return (
    <Modal open={open} onClose={handleClose} title={titles[step]}>
      {/* Same "genuinely separate component, mounted only while open" shape
          this file already used — a fresh mount per open means every field
          (including which step) resets to defaults for free. */}
      {open && (
        <EditProfileModalBody customer={customer} step={step} onStepChange={setStep} onClose={handleClose} onSaved={onSaved} />
      )}
    </Modal>
  )
}

interface BodyProps {
  customer: CustomerProfile
  step: 'edit' | 'mobile-phone' | 'mobile-otp'
  onStepChange: (step: 'edit' | 'mobile-phone' | 'mobile-otp') => void
  onClose: () => void
  onSaved: (customer: CustomerProfile) => void
}

const DEFAULT_OTP_LENGTH = 6

function messageFor(error: unknown, fallback: string): string {
  return error instanceof CustomerApiError ? error.message : fallback
}

function EditProfileModalBody({ customer, step, onStepChange, onClose, onSaved }: BodyProps) {
  // --- Step: edit (Name + Email) ---
  const [fullName, setFullName] = useState(customer.name)
  const [email, setEmail] = useState(customer.email)
  const [nameTouched, setNameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const trimmedName = fullName.trim()
  const trimmedEmail = email.trim()
  const isNameValid = trimmedName.length > 0
  const isEmailValid = isValidEmail(trimmedEmail)
  const nameError = nameTouched && !isNameValid ? 'Enter your full name.' : null
  const emailError = emailTouched && !isEmailValid ? 'Enter a valid email address.' : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    setApiError(null)
    setSaving(true)
    try {
      const updated = await updateProfile(trimmedName, trimmedEmail)
      onSaved(updated)
      onClose()
    } catch (error) {
      setApiError(messageFor(error, 'Could not update your profile. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  // --- Step: mobile-phone (enter new number, send OTP) ---
  const [newPhone, setNewPhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const isPhoneValid = isValidIndianMobile(newPhone)

  async function handleSendMobileOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPhoneTouched(true)
    if (!isPhoneValid) return
    setSendError(null)
    setSendingOtp(true)
    try {
      const result = await sendChangeMobileOtp(newPhone)
      setOtp('')
      setOtpLength(result.otpLength)
      startResendTimer(result.resendAfter)
      onStepChange('mobile-otp')
    } catch (error) {
      setSendError(messageFor(error, 'Could not send OTP. Please try again.'))
    } finally {
      setSendingOtp(false)
    }
  }

  // --- Step: mobile-otp (enter + verify code) ---
  const [otp, setOtp] = useState('')
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [resendSeconds, setResendSeconds] = useState(0)
  const timerRef = useRef<number | null>(null)
  const isOtpComplete = otp.length === otpLength && !otp.includes(' ')

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  function startResendTimer(seconds: number) {
    clearTimer()
    setResendSeconds(seconds)
    timerRef.current = window.setInterval(() => {
      setResendSeconds((current) => {
        if (current <= 1) {
          clearTimer()
          return 0
        }
        return current - 1
      })
    }, 1000)
  }
  useEffect(() => clearTimer, [])

  async function handleResendMobileOtp() {
    if (resendSeconds > 0 || resending) return
    setVerifyError(null)
    setResending(true)
    try {
      const result = await sendChangeMobileOtp(newPhone)
      setOtp('')
      setOtpLength(result.otpLength)
      startResendTimer(result.resendAfter)
    } catch (error) {
      if (error instanceof CustomerApiError && error.code === 'resend_cooldown') {
        // No retryAfter surfaced by this endpoint's error body today — the
        // countdown simply stays as-is rather than resyncing to a guess.
      }
      setVerifyError(messageFor(error, 'Could not resend OTP. Please try again.'))
    } finally {
      setResending(false)
    }
  }

  async function handleVerifyMobileOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isOtpComplete || verifying) return
    setVerifyError(null)
    setVerifying(true)
    try {
      const updated = await verifyChangeMobileOtp(newPhone, otp)
      onSaved(updated)
      onClose()
    } catch (error) {
      setVerifyError(messageFor(error, 'Something went wrong. Please try again.'))
    } finally {
      setVerifying(false)
    }
  }

  if (step === 'mobile-phone') {
    return (
      <form className="edit-profile-form" onSubmit={handleSendMobileOtp} noValidate>
        <button type="button" className="auth-form__back" onClick={() => onStepChange('edit')}>
          <ChevronLeftIcon /> Back
        </button>

        <p className="auth-form__subtext">Enter your new Indian mobile number. We'll send a code to verify it.</p>

        <div className={`form-field${phoneTouched && !isPhoneValid ? ' has-error' : ''}`}>
          <label htmlFor="change-mobile-phone">New Mobile Number</label>
          <div className="phone-input">
            <span className="phone-input__prefix" aria-hidden="true">
              +91
            </span>
            <input
              id="change-mobile-phone"
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              maxLength={10}
              value={newPhone}
              onChange={(event) => setNewPhone(sanitizeMobileInput(event.target.value))}
              onBlur={() => setPhoneTouched(true)}
            />
          </div>
          {phoneTouched && !isPhoneValid && (
            <span className="form-field__error" role="alert">
              Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.
            </span>
          )}
        </div>

        {sendError && (
          <p className="auth-form__notice auth-form__notice--error" role="alert">
            {sendError}
          </p>
        )}

        <div className="edit-profile-form__actions">
          <button type="button" className="btn btn--ghost" onClick={() => onStepChange('edit')}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!isPhoneValid || sendingOtp}>
            {sendingOtp ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </div>
      </form>
    )
  }

  if (step === 'mobile-otp') {
    return (
      <form className="edit-profile-form" onSubmit={handleVerifyMobileOtp} noValidate>
        <button type="button" className="auth-form__back" onClick={() => onStepChange('mobile-phone')}>
          <ChevronLeftIcon /> Back
        </button>

        <p className="auth-form__subtext">
          Enter the code sent to
          <br />
          <strong>+91 {formatGroupedIndianMobile(newPhone)}</strong>
        </p>

        <OtpInput length={otpLength} value={otp} onChange={setOtp} disabled={verifying} hasError={!!verifyError} />

        {verifyError && (
          <p className="auth-form__notice auth-form__notice--error" role="alert">
            {verifyError}
          </p>
        )}

        <p className="auth-resend" role="status">
          {resendSeconds > 0 ? (
            <>Resend OTP in {formatTimer(resendSeconds)}</>
          ) : (
            <>
              Didn&rsquo;t receive the code?{' '}
              <button type="button" className="auth-resend__link" onClick={handleResendMobileOtp} disabled={resending}>
                {resending ? 'Resending…' : 'Resend OTP'}
              </button>
            </>
          )}
        </p>

        <div className="edit-profile-form__actions">
          <button type="submit" className="btn btn--primary" disabled={!isOtpComplete || verifying}>
            {verifying ? 'Verifying…' : 'Verify & Update'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="edit-profile-form" onSubmit={handleSubmit} noValidate>
      <div className="edit-profile-form__phone">
        <span className="edit-profile-form__phone-label">Mobile Number</span>
        <span className="edit-profile-form__phone-value">
          +91 {formatGroupedIndianMobile(fromE164(customer.mobileNumber))}
          <CheckCircleIcon />
        </span>
        <button type="button" className="edit-profile-form__phone-change" onClick={() => onStepChange('mobile-phone')}>
          Change
        </button>
      </div>

      <div className={`form-field${nameError ? ' has-error' : ''}`}>
        <label htmlFor="edit-profile-name">Full Name</label>
        <input
          ref={nameRef}
          id="edit-profile-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          onBlur={() => setNameTouched(true)}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'edit-profile-name-error' : undefined}
        />
        {nameError && (
          <span id="edit-profile-name-error" className="form-field__error" role="alert">
            {nameError}
          </span>
        )}
      </div>

      <div className={`form-field${emailError ? ' has-error' : ''}`}>
        <label htmlFor="edit-profile-email">Email Address</label>
        <input
          ref={emailRef}
          id="edit-profile-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setEmailTouched(true)}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'edit-profile-email-error' : undefined}
        />
        {emailError && (
          <span id="edit-profile-email-error" className="form-field__error" role="alert">
            {emailError}
          </span>
        )}
      </div>

      {apiError && (
        <p className="auth-form__notice auth-form__notice--error" role="alert">
          {apiError}
        </p>
      )}

      <div className="edit-profile-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving || !isNameValid || !isEmailValid}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
