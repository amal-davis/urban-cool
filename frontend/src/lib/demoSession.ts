/**
 * Shared, in-memory demo-mode session for the customer side only (see
 * demoMode.ts) — genuine cross-file state, not this project's usual small
 * local copy: a customer's OTP verify happens in authApi.ts, but "am I
 * logged in" is answered by customerApi.ts's getProfile(), so both need to
 * see the same fake session. The technician side has no equivalent file —
 * technicianAuthApi.ts owns its own send/verify-otp *and* getTechnicianProfile,
 * so its demo session stays a local module-level variable there instead.
 */

export interface DemoCustomerProfile {
  name: string
  email: string
  mobileNumber: string
  memberSince: string | null
}

let session: DemoCustomerProfile | null = null

export function getDemoCustomerSession(): DemoCustomerProfile | null {
  return session
}

export function setDemoCustomerSession(profile: DemoCustomerProfile): void {
  session = profile
}

export function clearDemoCustomerSession(): void {
  session = null
}
