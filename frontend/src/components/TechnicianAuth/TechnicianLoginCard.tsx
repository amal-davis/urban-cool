import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TechnicianAuthApiError, sendTechnicianOtp, verifyTechnicianOtp } from '../../lib/technicianAuthApi'
import { useTechnicianAuth } from '../../lib/TechnicianAuthContext'
import { MobileNumberStep } from '../Auth/MobileNumberStep'
import { OtpStep } from '../Auth/OtpStep'
import '../Auth/LoginCard.css'

type Step = 'phone' | 'otp'

// Used only until the first sendTechnicianOtp() response comes back with the
// backend's real otp_length/resend_after — mirrors LoginCard's own
// DEFAULT_OTP_LENGTH constant (kept as a separate local copy, not a shared
// import — see AuthForm.css's comment on why this project doesn't share
// small snippets across component boundaries).
const DEFAULT_OTP_LENGTH = 6

function messageFor(error: unknown, fallback: string): string {
  return error instanceof TechnicianAuthApiError ? error.message : fallback
}

/**
 * Technician Login's own flow-state owner — structurally identical to
 * LoginCard.tsx (one step in the DOM at a time, every API call and state
 * transition lives here, MobileNumberStep/OtpStep stay presentational), but
 * talks to lib/technicianAuthApi.ts and lib/TechnicianAuthContext.tsx
 * instead of the customer versions, and always lands on /technician/
 * dashboard rather than /dashboard. Reuses MobileNumberStep/OtpStep
 * directly (same components LoginCard/SignupCard already share) via their
 * existing copy-override props, rather than forking them for this third
 * flow.
 */
export function TechnicianLoginCard() {
  const navigate = useNavigate()
  const location = useLocation()
  const technicianAuth = useTechnicianAuth()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH)

  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  const [sendError, setSendError] = useState<string | null>(null)
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

  // Cleans up the interval if the technician navigates away mid-countdown.
  useEffect(() => clearTimer, [])

  async function handleSendOtp(localNumber: string) {
    setSendError(null)
    setSendingOtp(true)
    try {
      const result = await sendTechnicianOtp(localNumber)
      setPhone(localNumber)
      setOtp('')
      setOtpLength(result.otpLength)
      setVerifyError(null)
      setStep('otp')
      startResendTimer(result.resendAfter)
    } catch (error) {
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
      const result = await sendTechnicianOtp(phone)
      setOtp('')
      setOtpLength(result.otpLength)
      startResendTimer(result.resendAfter)
    } catch (error) {
      // A 429 from the resend cooldown carries how long is actually left —
      // resync the visible timer to it instead of leaving the button
      // enabled with a stale "0" that would just 429 again.
      if (error instanceof TechnicianAuthApiError && error.retryAfter) {
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
      const technician = await verifyTechnicianOtp(phone, code)
      // verifyTechnicianOtp's own response already has the full technician
      // profile — seeds TechnicianAuthContext directly rather than an extra
      // fetch, same as SignupCard's auth.setCustomer.
      technicianAuth.setTechnician(technician)
      // TechnicianProtectedRoute sets this when it redirects here (e.g. a
      // bookmarked dashboard link opened signed out) — falls back to the
      // dashboard for a plain, unprompted visit to /technician/login.
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/technician/dashboard', { replace: true })
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
            onSubmit={handleSendOtp}
            heading="Urban Cool Technician Portal"
            subtext="Sign in with your registered mobile number to view your assigned jobs."
            submitLabel="Send OTP"
            submitLoadingLabel="Sending OTP…"
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
            verifyLabel="Verify & Login"
            verifyLoadingLabel="Verifying…"
          />
        </div>
      )}
    </div>
  )
}
