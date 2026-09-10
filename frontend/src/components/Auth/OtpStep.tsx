import type { FormEvent } from 'react'
import { ChevronLeftIcon } from '../icons/Icons'
import { formatGroupedIndianMobile, formatTimer } from '../../lib/indianPhone'
import { OtpInput } from './OtpInput'
import './AuthForm.css'

interface OtpStepProps {
  phone: string
  otpLength: number
  otp: string
  onOtpChange: (value: string) => void
  verifying: boolean
  resending: boolean
  resendSeconds: number
  error: string | null
  onVerify: (code: string) => void
  onResend: () => void
  onChangeNumber: () => void
  /** Shared by LoginCard and SignupCard — Login verifies straight into a
   *  session ("Verify & Sign In"), Signup only confirms the number and
   *  still has Step 3 ahead ("Verify Mobile Number"), so the button copy
   *  differs even though the OTP mechanics are identical. */
  verifyLabel?: string
  verifyLoadingLabel?: string
}

/** Step 2 — enter and verify the OTP that was just requested. */
export function OtpStep({
  phone,
  otpLength,
  otp,
  onOtpChange,
  verifying,
  resending,
  resendSeconds,
  error,
  onVerify,
  onResend,
  onChangeNumber,
  verifyLabel = 'Verify & Sign In',
  verifyLoadingLabel = 'Verifying…',
}: OtpStepProps) {
  // otp can contain internal spaces as placeholders for not-yet-filled
  // boxes (see OtpInput) — length alone isn't enough to call it complete.
  const isComplete = otp.length === otpLength && !otp.includes(' ')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || verifying) return
    onVerify(otp)
  }

  return (
    <div className="auth-form">
      <button type="button" className="auth-form__back" onClick={onChangeNumber}>
        <ChevronLeftIcon /> Back
      </button>

      <h1 className="auth-form__heading">Verify your mobile number</h1>
      <p className="auth-form__subtext">
        We&rsquo;ve sent a verification code to
        <br />
        <strong>+91 {formatGroupedIndianMobile(phone)}</strong>
      </p>

      <form className="auth-form__fields" onSubmit={handleSubmit} noValidate>
        <OtpInput length={otpLength} value={otp} onChange={onOtpChange} disabled={verifying} hasError={!!error} />

        {error && (
          <p className="auth-form__notice auth-form__notice--error" role="alert">
            {error}
          </p>
        )}

        <p className="auth-resend" role="status">
          {resendSeconds > 0 ? (
            <>Resend OTP in {formatTimer(resendSeconds)}</>
          ) : (
            <>
              Didn&rsquo;t receive the code?{' '}
              <button type="button" className="auth-resend__link" onClick={onResend} disabled={resending}>
                {resending ? 'Resending…' : 'Resend OTP'}
              </button>
            </>
          )}
        </p>

        <button type="submit" className="btn btn--primary btn--block" disabled={!isComplete || verifying}>
          {verifying ? verifyLoadingLabel : verifyLabel}
        </button>
      </form>
    </div>
  )
}
