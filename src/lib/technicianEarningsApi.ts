/**
 * Technician earnings API — GET /api/technician/earnings/ (backend/
 * bookings, see that app's views.py's technician_earnings). Real, backend-
 * fetched data: every figure here is computed straight from the
 * technician's own Booking rows' commission_amount/commission_paid —
 * both admin-set from Django Admin (BookingAdmin's list_editable
 * commission_amount/commission_paid columns), never something a
 * technician sets themselves. Replaces data/technicianDashboardData.ts's
 * mockEarnings.
 *
 * Only bookings with a commission actually set count toward any total
 * here — a job nobody's priced yet contributes nothing. totalServiceValue
 * is a documented approximation (the midpoint of each priced job's
 * estimated price range) — this app has no "actual final price" field at
 * all, see the backend view's own comment.
 */

import { DEMO_MODE, demoDelay } from './demoMode'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

// Demo mode (see demoMode.ts) — plausible static figures roughly consistent
// with technicianJobsApi.ts's own demo jobs (one completed, priced job
// there carries a ₹150 commission), not derived from them: this file's own
// established convention is a small local copy, not cross-module state.
const DEMO_EARNINGS = {
  totalCommissionEarned: 8400,
  monthCommissionEarned: 2100,
  totalServiceValue: 42000,
  commissionRate: 20,
  pendingPayout: 1200,
  paidAmount: 7200,
}

export class TechnicianEarningsApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'TechnicianEarningsApiError'
    this.status = status
  }
}

export interface TechnicianEarnings {
  totalCommissionEarned: number
  monthCommissionEarned: number
  totalServiceValue: number
  /** 0–100 — totalCommissionEarned / totalServiceValue, rounded server-side. */
  commissionRate: number
  pendingPayout: number
  paidAmount: number
}

interface TechnicianEarningsApiShape {
  total_commission_earned: string
  month_commission_earned: string
  total_service_value: string
  commission_rate: number
  pending_payout: string
  paid_amount: string
}

function mapEarnings(data: TechnicianEarningsApiShape): TechnicianEarnings {
  return {
    // Every money figure arrives as a string (DecimalField, serialized
    // as-is rather than coerced to a possibly-lossy float) — same
    // Number(...) mapping lib/bookingApi.ts's own mapBookingDetail already
    // uses for its own Decimal-backed latitude/longitude fields.
    totalCommissionEarned: Number(data.total_commission_earned),
    monthCommissionEarned: Number(data.month_commission_earned),
    totalServiceValue: Number(data.total_service_value),
    commissionRate: data.commission_rate,
    pendingPayout: Number(data.pending_payout),
    paidAmount: Number(data.paid_amount),
  }
}

export async function getTechnicianEarnings(): Promise<TechnicianEarnings> {
  if (DEMO_MODE) {
    await demoDelay()
    return DEMO_EARNINGS
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/technician/earnings/`, { method: 'GET', credentials: 'include' })
  } catch {
    throw new TechnicianEarningsApiError('Network error. Check your connection and try again.')
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : null
    throw new TechnicianEarningsApiError(detail ?? 'Something went wrong. Please try again.', response.status)
  }

  return mapEarnings(data as TechnicianEarningsApiShape)
}
