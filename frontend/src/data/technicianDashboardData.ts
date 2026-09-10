/**
 * Frontend-only mock data for the Technician Dashboard's fixed 5-step job
 * workflow and quick-action shortcuts — the only things left in this file
 * without a real backend surface behind them.
 *
 * Assigned jobs, Performance, and Earnings & Commission are all real — see
 * lib/technicianJobsApi.ts (GET /api/technician/jobs/, backend/bookings/
 * views.py's technician_jobs), which backs Today's Jobs, My Jobs, Upcoming
 * Jobs, and Job History; lib/technicianPerformanceApi.ts (GET /api/
 * technician/performance/), which backs the Performance Summary section
 * and page; and lib/technicianEarningsApi.ts (GET /api/technician/
 * earnings/), which backs the Earnings & Commission section and page. The
 * technician's own identity (name/mobile/email/specialization/photo/
 * address/experience) is likewise real, backed by GET/PATCH /api/
 * technician/profile/ — see lib/TechnicianAuthContext.tsx and
 * pages/TechnicianProfilePage.tsx.
 */

/** "₹1,250" — plain en-IN grouping, for the single-figure amounts the
 *  Earnings page and dashboard preview show — distinct from
 *  lib/bookingApi.ts's formatEstimatedCost, which always renders a
 *  *range*, not a single value. Kept as a small local copy per this
 *  project's own convention (see e.g. lib/bookingApi.ts's own header
 *  comment) rather than a cross-module import for one line. */
export function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export interface WorkflowStepInfo {
  step: number
  title: string
  description: string
  actionLabel: string
}

/** The fixed 5-step job workflow the brief specifies — not per-job data (a
 *  real job's Booking.status already models a similar progression, see
 *  backend/bookings/models.py's Booking.ACTIVE_STATUS_ORDER), so this
 *  stays a plain constant rather than something fetched. */
export const workflowSteps: WorkflowStepInfo[] = [
  { step: 1, title: 'Accept Job', description: 'Review the job details and accept the assignment.', actionLabel: 'Accept Job' },
  { step: 2, title: 'Start Service', description: 'Let the customer know you’ve arrived and begin work.', actionLabel: 'Start Service' },
  { step: 3, title: 'Add Estimate', description: 'Send the customer a repair estimate before proceeding.', actionLabel: 'Send Estimate' },
  { step: 4, title: 'Upload Photos', description: 'Capture before/after photos as proof of work done.', actionLabel: 'Upload Photos' },
  { step: 5, title: 'Complete Job', description: 'Mark the job complete once service is finished.', actionLabel: 'Complete Job' },
]

export interface QuickActionInfo {
  id: string
  label: string
}

export const quickActions: QuickActionInfo[] = [
  { id: 'estimate', label: 'Add Estimate' },
  { id: 'photos', label: 'Upload Photos' },
  { id: 'complete', label: 'Complete Job' },
  { id: 'chat', label: 'Chat with Office' },
]

