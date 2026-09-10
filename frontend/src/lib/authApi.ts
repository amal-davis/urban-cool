import { toE164 } from './indianPhone'
import { DEMO_MODE, demoDelay } from './demoMode'
import { setDemoCustomerSession } from './demoSession'

/**
 * OTP auth API — talks to the Django backend's session-based auth (see
 * backend/accounts). Kept isolated like lib/contactApi.ts: components only
 * ever call sendOtp/verifyOtp and handle whatever they resolve/reject with,
 * so swapping the transport later never touches UI code.
 *
 * Session, not token: backend/config/settings.py's REST_FRAMEWORK config
 * uses SessionAuthentication, so a successful verifyOtp() sets an httpOnly
 * session cookie server-side — there is no token for this file to store.
 * `credentials: 'include'` is what makes that cookie flow on every request;
 * nothing else needs to be persisted here. No OTP secrets, provider keys, or
 * codes are ever read, stored, or logged on this side of the API boundary.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class AuthApiError extends Error {
  code?: string
  retryAfter?: number
  attemptsRemaining?: number

  constructor(
    message: string,
    opts: { code?: string; retryAfter?: number; attemptsRemaining?: number } = {},
  ) {
    super(message)
    this.name = 'AuthApiError'
    this.code = opts.code
    this.retryAfter = opts.retryAfter
    this.attemptsRemaining = opts.attemptsRemaining
  }
}

interface ApiErrorBody {
  detail?: string
  code?: string
  retry_after?: number
  attempts_remaining?: number
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      // Required so the session cookie backend/accounts/views.py sets on a
      // successful verify actually gets stored/sent by the browser.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthApiError('Network error. Check your connection and try again.', {
      code: 'network_error',
    })
  }

  let data: (ApiErrorBody & Record<string, unknown>) | null = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    throw new AuthApiError(data?.detail ?? 'Something went wrong. Please try again.', {
      code: data?.code,
      retryAfter: data?.retry_after,
      attemptsRemaining: data?.attempts_remaining,
    })
  }

  return data as T
}

export interface SendOtpResult {
  expiresIn: number
  resendAfter: number
  otpLength: number
}

export interface VerifyOtpResult {
  phone: string
}

// Demo mode (see demoMode.ts) accepts any phone number/OTP unconditionally —
// there's no real SMS provider behind this build, so the usual "type the
// code you were sent" step would otherwise be a dead end. `otpLength: 6`
// matches DEFAULT_OTP_LENGTH in LoginCard.tsx/SignupCard.tsx, so the OTP
// step still renders its normal 6-box input.
const DEMO_OTP_RESULT = { expiresIn: 300, resendAfter: 30, otpLength: 6 }

export async function sendOtp(localNumber: string): Promise<SendOtpResult> {
  if (DEMO_MODE) {
    await demoDelay()
    return DEMO_OTP_RESULT
  }
  const data = await postJson<{ expires_in: number; resend_after: number; otp_length: number }>(
    '/api/auth/send-otp/',
    { phone: toE164(localNumber) },
  )
  return { expiresIn: data.expires_in, resendAfter: data.resend_after, otpLength: data.otp_length }
}

export async function verifyOtp(localNumber: string, otp: string): Promise<VerifyOtpResult> {
  if (DEMO_MODE) {
    await demoDelay()
    const phone = toE164(localNumber)
    // Seeds a believable profile from the number just entered — the next
    // getProfile() call (customerApi.ts) picks this straight up, same as a
    // real login would resolve to the account behind that number.
    setDemoCustomerSession({
      name: 'Demo Customer',
      email: 'demo.customer@example.com',
      mobileNumber: phone,
      memberSince: new Date().toISOString(),
    })
    return { phone }
  }
  const data = await postJson<{ user: { phone: string } }>('/api/auth/verify-otp/', {
    phone: toE164(localNumber),
    otp,
  })
  return { phone: data.user.phone }
}

// --- Signup (backend/accounts/urls.py's /api/auth/signup/* routes) ---
// A separate three-step flow from login's send/verify above, not because the
// OTP mechanics differ (they don't — same PhoneOTP model, same throttles),
// but because signup additionally (a) refuses a number that already has a
// completed account and (b) doesn't sign the user in on OTP verification —
// only once Step 3 (name + email) completes. See accounts/views.py for the
// server-side reasoning; this file just mirrors that contract.

export interface SignupSendOtpResult {
  expiresIn: number
  resendAfter: number
  otpLength: number
}

export async function signupSendOtp(localNumber: string): Promise<SignupSendOtpResult> {
  if (DEMO_MODE) {
    await demoDelay()
    return DEMO_OTP_RESULT
  }
  const data = await postJson<{ expires_in: number; resend_after: number; otp_length: number }>(
    '/api/auth/signup/send-otp/',
    { phone: toE164(localNumber) },
  )
  return { expiresIn: data.expires_in, resendAfter: data.resend_after, otpLength: data.otp_length }
}

export interface SignupVerifyOtpResult {
  phone: string
  /** Proof the number was OTP-verified, required by createAccount below.
   *  Opaque to the frontend — never decoded or inspected here, only
   *  round-tripped to the backend that issued it. */
  verificationToken: string
}

export async function verifySignupOtp(localNumber: string, otp: string): Promise<SignupVerifyOtpResult> {
  if (DEMO_MODE) {
    await demoDelay()
    const phone = toE164(localNumber)
    // Encodes the phone directly into the fake token — createAccount below
    // only ever receives this token back, never the phone itself (mirrors
    // the real backend's own "derive the number from the token" contract,
    // see that function's own comment), so this is the one place demo mode
    // has to smuggle it through.
    return { phone, verificationToken: `demo:${phone}` }
  }
  const data = await postJson<{ phone: string; verification_token: string }>('/api/auth/signup/verify-otp/', {
    phone: toE164(localNumber),
    otp,
  })
  return { phone: data.phone, verificationToken: data.verification_token }
}

export interface CreateAccountResult {
  phone: string
  fullName: string
  email: string
}

export async function createAccount(
  verificationToken: string,
  fullName: string,
  email: string,
): Promise<CreateAccountResult> {
  if (DEMO_MODE) {
    await demoDelay()
    const phone = verificationToken.startsWith('demo:') ? verificationToken.slice('demo:'.length) : ''
    setDemoCustomerSession({ name: fullName, email, mobileNumber: phone, memberSince: new Date().toISOString() })
    return { phone, fullName, email }
  }
  // No phone field here by design — the backend derives the verified number
  // from verificationToken alone (see CreateAccountSerializer), so this
  // request can't claim a number other than the one that was actually
  // OTP-verified.
  const data = await postJson<{ user: { phone: string; full_name: string; email: string } }>(
    '/api/auth/signup/create-account/',
    { verification_token: verificationToken, full_name: fullName, email },
  )
  return { phone: data.user.phone, fullName: data.user.full_name, email: data.user.email }
}
