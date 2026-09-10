import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CustomerApiError, getProfile, logout as logoutRequest } from './customerApi'
import type { CustomerProfile } from './customerApi'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  /** null whenever status isn't 'authenticated'. */
  customer: CustomerProfile | null
  /** Sets the signed-in customer directly (Login/Signup/profile-update/
   *  change-mobile all already get the fresh profile back in their own API
   *  response — this avoids a redundant extra fetch after each). */
  setCustomer: (customer: CustomerProfile) => void
  /** Re-fetches from the backend — used after Login, where the OTP-verify
   *  response has no profile fields to seed setCustomer with directly. */
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * The project's one source of truth for "who is signed in," backed by
 * Django's session cookie rather than anything in localStorage — there is
 * no separate token to store for session auth (see customerApi.ts), so this
 * context just mirrors "did GET /api/customer/profile/ succeed," which is
 * the correct way to answer "am I logged in" for this project's auth
 * mechanism. Every consumer (Navbar, ProtectedRoute, the dashboard, Login/
 * Signup) reads this instead of duplicating its own auth check.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [customer, setCustomerState] = useState<CustomerProfile | null>(null)

  const refresh = useCallback(async () => {
    try {
      const profile = await getProfile()
      setCustomerState(profile)
      setStatus('authenticated')
    } catch {
      // A 401/403 means "not signed in" — the normal logged-out state, not
      // a failure to surface. Any other error (network down, 500, ...)
      // still lands here as logged-out too: there's no safe way to show
      // protected data without a confirmed session, so ProtectedRoute's
      // redirect-to-Login is the right outcome either way.
      setCustomerState(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setCustomer = useCallback((next: CustomerProfile) => {
    setCustomerState(next)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch (error) {
      // Already-expired-session logouts (e.g. a stale tab) shouldn't block
      // clearing local state — the session is either gone server-side
      // already or about to be treated as such either way.
      if (!(error instanceof CustomerApiError && error.status === 403)) {
        throw error
      }
    } finally {
      setCustomerState(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo(
    () => ({ status, customer, setCustomer, refresh, logout }),
    [status, customer, setCustomer, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
