/**
 * Technician performance API — GET /api/technician/performance/ (backend/
 * bookings, see that app's views.py's technician_performance). Real,
 * backend-fetched data: every figure here is computed straight from the
 * technician's own Booking rows, replacing data/technicianDashboardData.ts's
 * mockPerformance (see that file's own updated header comment — only
 * Earnings/the fixed 5-step workflow stay mock there now).
 *
 * Deliberately smaller than the old mock shape: there is no rating/review
 * feature anywhere in this app yet (customers never rate a technician after
 * a job), so "Average Rating"/"Customer Satisfaction" aren't part of this
 * API and never appear on TechnicianPerformancePage — showing them would
 * mean fabricating a number nothing backs.
 */

import { DEMO_MODE, demoDelay } from './demoMode'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

// Demo mode (see demoMode.ts) — plausible static figures, same reasoning as
// technicianEarningsApi.ts's own DEMO_EARNINGS.
const DEMO_PERFORMANCE = {
  totalJobs: 42,
  completedJobs: 38,
  cancelledJobs: 2,
  completionRate: 90,
  avgResponseTimeMinutes: 18,
}

export class TechnicianPerformanceApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'TechnicianPerformanceApiError'
    this.status = status
  }
}

export interface TechnicianPerformance {
  totalJobs: number
  completedJobs: number
  cancelledJobs: number
  /** 0–100, rounded. */
  completionRate: number
  /** Rounded minutes between a job landing on this technician and them
   *  setting off, averaged across every job that's reached that point —
   *  null until at least one has (a brand-new technician, or one whose
   *  jobs are all still sitting at 'assigned'). */
  avgResponseTimeMinutes: number | null
}

interface TechnicianPerformanceApiShape {
  total_jobs: number
  completed_jobs: number
  cancelled_jobs: number
  completion_rate: number
  avg_response_time_minutes: number | null
}

function mapPerformance(data: TechnicianPerformanceApiShape): TechnicianPerformance {
  return {
    totalJobs: data.total_jobs,
    completedJobs: data.completed_jobs,
    cancelledJobs: data.cancelled_jobs,
    completionRate: data.completion_rate,
    avgResponseTimeMinutes: data.avg_response_time_minutes,
  }
}

export async function getTechnicianPerformance(): Promise<TechnicianPerformance> {
  if (DEMO_MODE) {
    await demoDelay()
    return DEMO_PERFORMANCE
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/technician/performance/`, { method: 'GET', credentials: 'include' })
  } catch {
    throw new TechnicianPerformanceApiError('Network error. Check your connection and try again.')
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : null
    throw new TechnicianPerformanceApiError(detail ?? 'Something went wrong. Please try again.', response.status)
  }

  return mapPerformance(data as TechnicianPerformanceApiShape)
}
