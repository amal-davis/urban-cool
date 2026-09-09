import { toE164 } from './indianPhone'

/**
 * Technician OTP auth API — talks to the Django backend's session-based
 * auth (see backend/accounts, the /api/technician/* routes). A separate,
 * parallel file from lib/authApi.ts (customer login) rather than a shared
 * one: same OTP mechanics and same session-cookie mechanism underneath (see
 * backend/accounts/views.py's technician_send_otp/technician_verify_otp,
 * which reuse the exact same PhoneOTP model and _issue_otp/_consume_otp
 * helpers customer login does, just scoped to TechnicianProfile and the
 * technician_login OTP purpose), but a technician session and a customer
 * session are never the same thing — see TechnicianAuthContext.tsx, which
 * checks a different endpoint than AuthContext.tsx for exactly that reason.
 *
 * Session, not token — same reasoning as authApi.ts. `credentials:
 * 'include'` is what makes the session cookie a successful verify sets
 * actually flow on every subsequent request; nothing else needs to be
 * persisted here. No OTP secrets or codes are ever read, stored, or logged
 * on this side of the API boundary.
 *
 * X-CSRFToken (getCsrfToken below) is sent on every request here, same as
 * lib/customerApi.ts's own authenticated endpoints — NOT because these two
 * views require login (they're AllowAny), but because DRF's
 * SessionAuthentication enforces CSRF on *any* request it resolves to an
 * already-authenticated user, and this same browser may well already carry
 * an unrelated authenticated session cookie (a customer login, or a staff
 * login at /admin/, both on the same origin as this API) even while
 * visiting the technician login page signed out *as a technician*. Without
 * this header that surfaces as "CSRF Failed: CSRF token missing." — sending
 * it unconditionally costs nothing when no such session exists (the cookie
 * is simply empty) and fixes it either way.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export class TechnicianAuthApiError extends Error {
  code?: string
  status?: number
  retryAfter?: number
  attemptsRemaining?: number

  constructor(
    message: string,
    opts: { code?: string; status?: number; retryAfter?: number; attemptsRemaining?: number } = {},
  ) {
    super(message)
    this.name = 'TechnicianAuthApiError'
    this.code = opts.code
    this.status = opts.status
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

async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // CSRF only applies to unsafe methods — Django never checks it on
        // GET, and getCsrfToken() would just be a wasted cookie read there.
        ...(method === 'GET' ? {} : { 'X-CSRFToken': getCsrfToken() }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new TechnicianAuthApiError('Network error. Check your connection and try again.', {
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
    throw new TechnicianAuthApiError(data?.detail ?? 'Something went wrong. Please try again.', {
      code: data?.code,
      status: response.status,
      retryAfter: data?.retry_after,
      attemptsRemaining: data?.attempts_remaining,
    })
  }

  return data as T
}

// --- Login (Step 1: send-otp, Step 2: verify-otp) ---

export interface SendTechnicianOtpResult {
  expiresIn: number
  resendAfter: number
  otpLength: number
}

export async function sendTechnicianOtp(localNumber: string): Promise<SendTechnicianOtpResult> {
  // `phone`, not `mobile_number` — the backend view reuses the exact same
  // SendOtpSerializer every other OTP endpoint in this project does (see
  // backend/accounts/views.py's technician_send_otp), so the request body
  // shape matches sendOtp()/signupSendOtp() in lib/authApi.ts exactly
  // rather than inventing a one-off field name for just this endpoint.
  const data = await request<{ expires_in: number; resend_after: number; otp_length: number }>(
    'POST',
    '/api/technician/auth/send-otp/',
    { phone: toE164(localNumber) },
  )
  return { expiresIn: data.expires_in, resendAfter: data.resend_after, otpLength: data.otp_length }
}

export interface TechnicianProfile {
  id: number
  name: string
  mobileNumber: string
  email: string
  /** Absolute, fetchable URL, or null if no photo has been uploaded —
   *  mapped from the backend's MEDIA_URL-relative path the same way
   *  bookingApi.ts's own image fields are (see mapTechnicianProfile below). */
  profileImageUrl: string | null
  addressLine: string
  city: string
  state: string
  pincode: string
  specialization: string
  experienceYears: number
  isActive: boolean
}

interface TechnicianProfileApiShape {
  id: number
  name: string
  mobile_number: string
  email: string
  profile_image: string | null
  address_line: string
  city: string
  state: string
  pincode: string
  specialization: string
  experience_years: number
  is_active: boolean
}

function mapTechnicianProfile(data: TechnicianProfileApiShape): TechnicianProfile {
  return {
    id: data.id,
    name: data.name,
    mobileNumber: data.mobile_number,
    email: data.email,
    profileImageUrl: data.profile_image ? `${API_BASE_URL}${data.profile_image}` : null,
    addressLine: data.address_line,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    specialization: data.specialization,
    experienceYears: data.experience_years,
    isActive: data.is_active,
  }
}

export async function verifyTechnicianOtp(localNumber: string, otp: string): Promise<TechnicianProfile> {
  const data = await request<{ technician: TechnicianProfileApiShape }>('POST', '/api/technician/auth/verify-otp/', {
    phone: toE164(localNumber),
    otp,
  })
  return mapTechnicianProfile(data.technician)
}

/** Also doubles as "am I logged in as a technician?" — TechnicianAuthContext
 *  calls this on mount and treats a 401/403/404 as unauthenticated rather
 *  than an error to surface (see that file's own comment on why: a 404
 *  here is indistinguishable from "this session is a customer's, not a
 *  technician's," by design — see backend/accounts/views.py's
 *  technician_profile). */
export async function getTechnicianProfile(): Promise<TechnicianProfile> {
  return mapTechnicianProfile(await request<TechnicianProfileApiShape>('GET', '/api/technician/profile/'))
}

/** Backs TechnicianProfilePage.tsx's "Save Changes" — PATCHes exactly the
 *  fields that page lets a technician edit (name/email/address/experience).
 *  mobile_number/specialization/is_active/profile_image are read-only on
 *  the backend's TechnicianSelfSerializer regardless of what's passed here
 *  (see backend/accounts/serializers.py), so this only ever accepts the
 *  subset that can actually change. */
export async function updateTechnicianProfile(patch: {
  name: string
  email: string
  addressLine: string
  city: string
  state: string
  pincode: string
  experienceYears: number
}): Promise<TechnicianProfile> {
  const data = await request<TechnicianProfileApiShape>('PATCH', '/api/technician/profile/', {
    name: patch.name,
    email: patch.email,
    address_line: patch.addressLine,
    city: patch.city,
    state: patch.state,
    pincode: patch.pincode,
    experience_years: patch.experienceYears,
  })
  return mapTechnicianProfile(data)
}

// --- Logout ---
//
// Deliberately NOT a separate technician-specific request — backend/
// accounts/urls.py's POST /api/auth/logout/ already just ends whatever
// session exists via Django's own logout(), regardless of whether it
// belongs to a customer or a technician. lib/customerApi.ts's own logout()
// hits the exact same endpoint; TechnicianAuthContext imports it directly
// rather than duplicating this one-line wrapper a second time here.
export { logout as logoutTechnician } from './customerApi'
