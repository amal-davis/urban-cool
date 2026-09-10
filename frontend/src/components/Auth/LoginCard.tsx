import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthApiError, sendOtp, verifyOtp } from '../../lib/authApi'
import { useAuth } from '../../lib/AuthContext'
import { MobileNumberStep } from './MobileNumberStep'
import { OtpStep } from './OtpStep'
import './LoginCard.css'

type Step = 'phone' | 'otp'

// Used only until the first sendOtp() response comes back with the
// backend's real otp_length/resend_after — see handleSendOtp below.
const DEFAULT_OTP_LENGTH = 6

function messageFor(error: unknown, fallback: string): string {
  return error instanceof AuthApiError ? error.message : fallback
}

/**
 * Owns all auth-flow state (current step, phone, OTP, the three independent
 * loading flags, the resend timer, and both error slots) and renders
 * exactly one step at a time — MobileNumberStep and OtpStep are never both
 * mounted together, per the "don't show both forms at once" requirement.
 * The two step components stay presentational; every API call and every
 * state transition lives here.
 */
export function LoginCard() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH)

  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  const [sendError, setSendError] = useState<string | null>(null)
  const [sendErrorAction, setSendErrorAction] = useState<{ label: string; to: string } | undefined>(undefined)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const [resendSeconds, setResendSeconds] = useState(0)
  const timerRef = useRef<number | null>(null)

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function startResendTimer(seconds: number) {
    clearTimer()
    setResendSeconds(seconds)
    // One interval at a time — clearTimer() above guarantees the previous
    // one is gone before this one starts, so resend/send can never stack
    // multiple concurrent countdowns.
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

  // Cleans up the interval if the user navigates away mid-countdown.
  useEffect(() => clearTimer, [])

  async function handleSendOtp(localNumber: string) {
    setSendError(null)
    setSendErrorAction(undefined)
    setSendingOtp(true)
    try {
      const result = await sendOtp(localNumber)
      setPhone(localNumber)
      setOtp('')
      setOtpLength(result.otpLength)
      setVerifyError(null)
      setStep('otp')
      startResendTimer(result.resendAfter)
    } catch (error) {
      // Mirrors SignupCard's account_exists -> "Log In" link, in reverse:
      // a number with no completed Signup (backend/accounts/views.py's
      // send_otp) gets pointed at Signup instead of a dead-end error.
      if (error instanceof AuthApiError && error.code === 'not_registered') {
        setSendErrorAction({ label: 'Sign Up', to: '/signup' })
      }
      setSendError(messageFor(error, 'Could not send OTP. Please try again.'))
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleResend() {
    if (resendSeconds > 0 || resending) return
    setVerifyError(null)
    setResending(true)
    try {
      const result = await sendOtp(phone)
      setOtp('')
      setOtpLength(result.otpLength)
      startResendTimer(result.resendAfter)
    } catch (error) {
      // A 429 from the resend cooldown carries how long is actually left —
      // resync the visible timer to it instead of leaving the button
      // enabled with a stale "0" that would just 429 again.
      if (error instanceof AuthApiError && error.retryAfter) {
        startResendTimer(error.retryAfter)
      }
      setVerifyError(messageFor(error, 'Could not resend OTP. Please try again.'))
    } finally {
      setResending(false)
    }
  }

  async function handleVerify(code: string) {
    setVerifyError(null)
    setVerifying(true)
    try {
      await verifyOtp(phone, code)
      // Session cookie is already set by the backend at this point (see
      // authApi.ts). verifyOtp's own response has no name/email though —
      // just the phone — so this refetches the full profile once via
      // AuthContext rather than navigating to a dashboard that would
      // otherwise render with a still-null customer for a moment.
      await auth.refresh()
      // ProtectedRoute (e.g. a booking page reached while signed out) sets
      // this when it redirects here — falls back to the dashboard for a
      // plain, unprompted visit to /login.
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/dashboard', { replace: true })
    } catch (error) {
      setVerifyError(messageFor(error, 'Something went wrong. Please try again.'))
    } finally {
      setVerifying(false)
    }
  }

  function handleChangeNumber() {
    setStep('phone')
    setOtp('')
    setVerifyError(null)
    clearTimer()
    setResendSeconds(0)
  }

  return (
    <div className="auth-card">
      {step === 'phone' ? (
        <div key="phone" className="auth-step">
          <MobileNumberStep
            initialValue={phone}
            loading={sendingOtp}
            apiError={sendError}
            apiErrorAction={sendErrorAction}
            onSubmit={handleSendOtp}
            footer={
              <p className="auth-resend">
                Don&rsquo;t have an account?{' '}
                <Link to="/signup" className="auth-resend__link">
                  Sign Up
                </Link>
              </p>
            }
          />
        </div>
      ) : (
        <div key="otp" className="auth-step">
          <OtpStep
            phone={phone}
            otpLength={otpLength}
            otp={otp}
            onOtpChange={setOtp}
            verifying={verifying}
            resending={resending}
            resendSeconds={resendSeconds}
            error={verifyError}
            onVerify={handleVerify}
            onResend={handleResend}
            onChangeNumber={handleChangeNumber}
          />
        </div>
      )}
    </div>
  )
}
