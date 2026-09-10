import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getTechnicianProfile, logoutTechnician } from './technicianAuthApi'
import type { TechnicianProfile } from './technicianAuthApi'

type TechnicianAuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface TechnicianAuthContextValue {
  status: TechnicianAuthStatus
  /** null whenever status isn't 'authenticated'. */
  technician: TechnicianProfile | null
  /** Sets the signed-in technician directly — TechnicianLoginCard's verify
   *  step already gets the fresh profile back in its own API response (see
   *  technicianAuthApi.ts's verifyTechnicianOtp), same as AuthContext's
   *  setCustomer avoiding a redundant extra fetch after Login/Signup. */
  setTechnician: (technician: TechnicianProfile) => void
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const TechnicianAuthContext = createContext<TechnicianAuthContextValue | null>(null)

/**
 * The technician portal's own "who is signed in," parallel to (and
 * deliberately separate from) AuthContext.tsx's customer version — backed
 * by the same Django session cookie mechanism, but by GET /api/technician/
 * profile/ instead of /api/customer/profile/. That distinction is exactly
 * what keeps customer and technician auth from ever being confused with
 * each other: a customer's session has no technician_profile row, so that
 * endpoint 404s for them exactly like a logged-out visitor would (see
 * backend/accounts/views.py's technician_profile), and this context
 * correctly reports 'unauthenticated' either way. TechnicianProtectedRoute
 * is this context's only consumer today (no technician-facing Navbar exists
 * yet to also need this state, unlike AuthContext).
 */
export function TechnicianAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TechnicianAuthStatus>('loading')
  const [technician, setTechnicianState] = useState<TechnicianProfile | null>(null)

  const refresh = useCallback(async () => {
    try {
      const profile = await getTechnicianProfile()
      setTechnicianState(profile)
      setStatus('authenticated')
    } catch {
      // A 401/403/404 all mean "not signed in as a technician" — the normal
      // logged-out state (or a customer's own session — see this file's own
      // comment above), not a failure to surface. Any other error (network
      // down, 500, ...) still lands here as logged-out too: there's no safe
      // way to show the dashboard without a confirmed technician session.
      setTechnicianState(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setTechnician = useCallback((next: TechnicianProfile) => {
    setTechnicianState(next)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutTechnician()
    } finally {
      setTechnicianState(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo(
    () => ({ status, technician, setTechnician, refresh, logout }),
    [status, technician, setTechnician, refresh, logout],
  )

  return <TechnicianAuthContext.Provider value={value}>{children}</TechnicianAuthContext.Provider>
}

export function useTechnicianAuth(): TechnicianAuthContextValue {
  const context = useContext(TechnicianAuthContext)
  if (!context) {
    throw new Error('useTechnicianAuth must be used within a TechnicianAuthProvider')
  }
  return context
}
