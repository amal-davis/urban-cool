import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AuthApiError,
  createAccount,
  signupSendOtp,
  verifySignupOtp,
} from '../../lib/authApi'
import { useAuth } from '../../lib/AuthContext'
import { toE164 } from '../../lib/indianPhone'
import { MobileNumberStep } from './MobileNumberStep'
import { OtpStep } from './OtpStep'
import { ProfileStep } from './ProfileStep'
import './SignupCard.css'

type Step = 'phone' | 'otp' | 'profile'

// Used only until the first signupSendOtp() response comes back with the
// backend's real otp_length/resend_after — see handleSendOtp below. Mirrors
// LoginCard's own DEFAULT_OTP_LENGTH constant (kept as a separate local
// copy rather than a shared import — see AuthForm.css's comment on why this
// project doesn't share small constants/CSS across component boundaries).
const DEFAULT_OTP_LENGTH = 6

// Error codes the backend can return that mean "the current step's frontend
// state no longer matches reality" — the fix is always the same: drop back
// to Step 1 with an explanatory message, never let the user retry Step 3
// against a token that's dead. See accounts/views.py for where these come
// from (signup_verify_otp / signup_create_account).
const RESTART_AT_PHONE_CODES = new Set(['account_exists', 'verification_expired', 'verification_invalid'])

function messageFor(error: unknown, fallback: string): string {
  return error instanceof AuthApiError ? error.message : fallback
}

/**
 * Owns all signup-flow state (current step, phone, its verification
 * status/token, OTP, full name, email, every independent loading flag, the
 * resend timer, and each error slot) and renders exactly one step at a
 * time — MobileNumberStep, OtpStep, and ProfileStep are never mounted
 * together, matching LoginCard's own "one step in the DOM" shape. The step
 * components stay presentational; every API call and state transition
 * lives here, same split as LoginCard.
 */
export function SignupCard() {
  const navigate = useNavigate()
  const auth = useAuth()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)

  const [sendError, setSendError] = useState<string | null>(null)
  const [sendErrorAction, setSendErrorAction] = useState<{ label: string; to: string } | undefined>(undefined)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [emailApiError, setEmailApiError] = useState<string | null>(null)

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

  /** Returns to Step 1 with the number still in the field but its
   *  verification state cleared — used both for the user-initiated "Back" /
   *  "Change number" actions and for a backend telling us the current
   *  verification is no longer valid. */
  function resetToPhoneStep() {
    setStep('phone')
    setOtp('')
    setVerifyError(null)
    setProfileError(null)
    setEmailApiError(null)
    setVerificationToken('')
    clearTimer()
    setResendSeconds(0)
  }

  async function handleSendOtp(localNumber: string) {
    setSendError(null)
    setSendErrorAction(undefined)
    setSendingOtp(true)
    try {
      const result = await signupSendOtp(localNumber)
      setPhone(localNumber)
      setOtp('')
      setOtpLength(result.otpLength)
      setVerifyError(null)
      setStep('otp')
      startResendTimer(result.resendAfter)
    } catch (error) {
      if (error instanceof AuthApiError && error.code === 'account_exists') {
        setSendErrorAction({ label: 'Log In', to: '/login' })
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
      const result = await signupSendOtp(phone)
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
      const result = await verifySignupOtp(phone, code)
      setVerificationToken(result.verificationToken)
      setOtp('')
      setProfileError(null)
      setEmailApiError(null)
      setStep('profile')
    } catch (error) {
      if (error instanceof AuthApiError && RESTART_AT_PHONE_CODES.has(error.code ?? '')) {
        resetToPhoneStep()
        setSendError(error.message)
        if (error.code === 'account_exists') {
          setSendErrorAction({ label: 'Log In', to: '/login' })
        }
        return
      }
      setVerifyError(messageFor(error, 'Something went wrong. Please try again.'))
    } finally {
      setVerifying(false)
    }
  }

  async function handleCreateAccount(name: string, emailValue: string) {
    setProfileError(null)
    setEmailApiError(null)
    setCreatingAccount(true)
    try {
      const created = await createAccount(verificationToken, name, emailValue)
      // Session cookie is already set by the backend at this point (see
      // authApi.ts/accounts/views.py's login() call) — signup ends
      // automatically signed in, same mechanism LoginCard relies on.
      // createAccount's own response already has name/email/phone, so this
      // seeds AuthContext directly instead of an extra profile fetch.
      auth.setCustomer({
        name: created.fullName,
        email: created.email,
        mobileNumber: toE164(created.phone),
        // Signup's own response has no date_joined — filled in by the next
        // real profile fetch (e.g. opening the dashboard's Edit Profile).
        memberSince: null,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof AuthApiError && error.code === 'email_exists') {
        setEmailApiError(error.message)
        return
      }
      if (error instanceof AuthApiError && RESTART_AT_PHONE_CODES.has(error.code ?? '')) {
        resetToPhoneStep()
        setSendError(error.message)
        if (error.code === 'account_exists') {
          setSendErrorAction({ label: 'Log In', to: '/login' })
        }
        return
      }
      setProfileError(messageFor(error, 'Could not create your account. Please try again.'))
    } finally {
      setCreatingAccount(false)
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    // A stale "already registered" error from the backend shouldn't survive
    // the user editing the field it was about.
    setEmailApiError(null)
  }

  return (
    <div className="auth-card">
      {step === 'phone' && (
        <div key="phone" className="auth-step">
          <MobileNumberStep
            initialValue={phone}
            loading={sendingOtp}
            apiError={sendError}
            apiErrorAction={sendErrorAction}
            onSubmit={handleSendOtp}
            heading="Create your account"
            subtext="Book and manage your services easily. First, verify your mobile number."
            footer={
              <p className="auth-resend">
                Already have an account?{' '}
                <Link to="/login" className="auth-resend__link">
                  Log In
                </Link>
              </p>
            }
          />
        </div>
      )}

      {step === 'otp' && (
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
            onChangeNumber={resetToPhoneStep}
            verifyLabel="Verify Mobile Number"
          />
        </div>
      )}

      {step === 'profile' && (
        <div key="profile" className="auth-step">
          <ProfileStep
            phone={phone}
            fullName={fullName}
            email={email}
            onFullNameChange={setFullName}
            onEmailChange={handleEmailChange}
            loading={creatingAccount}
            apiError={profileError}
            emailApiError={emailApiError}
            onSubmit={handleCreateAccount}
            onChangeNumber={resetToPhoneStep}
          />
        </div>
      )}
    </div>
  )
}
