import { toE164 } from './indianPhone'

/**
 * Authenticated customer API — profile, address, logout, and the OTP-gated
 * mobile-number change flow (backend/accounts, all under /api/customer/ and
 * /api/auth/*). Kept isolated like lib/authApi.ts/lib/contactApi.ts: callers
 * only ever call these functions and handle whatever they resolve/reject
 * with, so swapping the transport later never touches UI code.
 *
 * Session, not token — same reasoning as authApi.ts. Unlike the anonymous
 * OTP endpoints authApi.ts talks to, every endpoint here requires an
 * authenticated session, so DRF's SessionAuthentication also enforces CSRF
 * on every non-GET request: getCsrfToken() below reads the `csrftoken`
 * cookie Django's own CSRF middleware already sets, and every mutating
 * request sends it back as X-CSRFToken.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class CustomerApiError extends Error {
  code?: string
  /** HTTP status of the failed response — lets callers distinguish "not
   *  logged in" (401/403) from a real failure without parsing `code`. */
  status?: number

  constructor(message: string, opts: { code?: string; status?: number } = {}) {
    super(message)
    this.name = 'CustomerApiError'
    this.code = opts.code
    this.status = opts.status
  }
}

interface ApiErrorBody {
  detail?: string
  code?: string
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
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
    throw new CustomerApiError('Network error. Check your connection and try again.', { code: 'network_error' })
  }

  let data: (ApiErrorBody & Record<string, unknown>) | null = null
  try {
    data = await response.json()
  } catch {
    // No body (e.g. a 204 from DELETE) / not JSON — data stays null.
  }

  if (!response.ok) {
    throw new CustomerApiError(data?.detail ?? 'Something went wrong. Please try again.', {
      code: data?.code,
      status: response.status,
    })
  }

  return data as T
}

// --- Profile ---

export interface CustomerProfile {
  name: string
  email: string
  /** E.164-ish, e.g. "+919876543210" — same format accounts.Customer stores. */
  mobileNumber: string
  /** "March 2025" — formatted here so every consumer (ProfileHeader,
   *  ProfileOverviewSection) gets the same display string without each
   *  reimplementing the same Intl call. null only for values seeded
   *  directly from Signup's own response (see SignupCard.tsx), which
   *  doesn't carry date_joined — the next profile fetch fills it in. */
  memberSince: string | null
}

interface ProfileApiShape {
  name: string
  email: string
  mobile_number: string
  date_joined: string
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function mapProfile(data: ProfileApiShape): CustomerProfile {
  return {
    name: data.name,
    email: data.email,
    mobileNumber: data.mobile_number,
    memberSince: formatMemberSince(data.date_joined),
  }
}

/** Also doubles as "am I logged in?" — AuthContext calls this on mount and
 *  treats a 401/403 as unauthenticated rather than an error to surface. */
export async function getProfile(): Promise<CustomerProfile> {
  return mapProfile(await request<ProfileApiShape>('GET', '/api/customer/profile/'))
}

/** mobile_number is intentionally not a parameter here — the backend's
 *  CustomerProfileSerializer marks it read-only, so there is nothing this
 *  call could do to change it even if it tried. See sendChangeMobileOtp/
 *  verifyChangeMobileOtp below for the only way that number changes. */
export async function updateProfile(name: string, email: string): Promise<CustomerProfile> {
  return mapProfile(await request<ProfileApiShape>('PATCH', '/api/customer/profile/', { name, email }))
}

// --- Address ---

export interface CustomerAddress {
  id: number
  addressLine: string
  city: string
  state: string
  pincode: string
}

export interface AddressInput {
  addressLine: string
  city: string
  state: string
  pincode: string
}

interface AddressApiShape {
  id: number
  address_line: string
  city: string
  state: string
  pincode: string
}

function mapAddress(data: AddressApiShape): CustomerAddress {
  return { id: data.id, addressLine: data.address_line, city: data.city, state: data.state, pincode: data.pincode }
}

function addressPayload(values: AddressInput) {
  return { address_line: values.addressLine, city: values.city, state: values.state, pincode: values.pincode }
}

/** null = no address saved yet (backend returns 404) — a normal, expected
 *  state for a new customer, not an error. Any other failure still throws. */
export async function getAddress(): Promise<CustomerAddress | null> {
  try {
    return mapAddress(await request<AddressApiShape>('GET', '/api/customer/address/'))
  } catch (error) {
    if (error instanceof CustomerApiError && error.status === 404) return null
    throw error
  }
}

export async function createAddress(values: AddressInput): Promise<CustomerAddress> {
  return mapAddress(await request<AddressApiShape>('POST', '/api/customer/address/', addressPayload(values)))
}

export async function updateAddress(values: AddressInput): Promise<CustomerAddress> {
  return mapAddress(await request<AddressApiShape>('PATCH', '/api/customer/address/', addressPayload(values)))
}

export async function deleteAddress(): Promise<void> {
  await request<void>('DELETE', '/api/customer/address/')
}

// --- Logout ---

export async function logout(): Promise<void> {
  await request<void>('POST', '/api/auth/logout/')
}

// --- Change mobile number (OTP-gated — see accounts/views.py's
// change_mobile_send_otp/change_mobile_verify_otp) ---

export interface SendChangeMobileOtpResult {
  expiresIn: number
  resendAfter: number
  otpLength: number
}

export async function sendChangeMobileOtp(localNumber: string): Promise<SendChangeMobileOtpResult> {
  const data = await request<{ expires_in: number; resend_after: number; otp_length: number }>(
    'POST',
    '/api/auth/change-mobile/send-otp/',
    { phone: toE164(localNumber) },
  )
  return { expiresIn: data.expires_in, resendAfter: data.resend_after, otpLength: data.otp_length }
}

export async function verifyChangeMobileOtp(localNumber: string, otp: string): Promise<CustomerProfile> {
  return mapProfile(
    await request<ProfileApiShape>('POST', '/api/auth/change-mobile/verify-otp/', {
      phone: toE164(localNumber),
      otp,
    }),
  )
}
