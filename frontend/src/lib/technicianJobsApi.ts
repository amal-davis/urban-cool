import type { BookingStatus } from './bookingApi'
import { ACTIVE_STATUS_ORDER, bookingStatusLabels, bookingStatusMessages, statusGroup } from './bookingApi'
import { timeSlotLabel as demoTimeSlotLabel } from '../data/bookingTimeSlots'
import { DEMO_MODE, demoDelay } from './demoMode'

/**
 * Technician jobs API — GET /api/technician/jobs/, GET /api/technician/
 * jobs/<id>/, and PATCH /api/technician/jobs/<id>/status/ (backend/
 * bookings, see that app's views.py's technician_jobs/technician_job_
 * detail/technician_job_update_status). Real, backend-fetched data: a
 * technician's own assigned bookings, replacing the earlier mock job list
 * in data/technicianDashboardData.ts (see that file's own updated header
 * comment — only Earnings/Performance/the fixed 5-step workflow stay mock
 * there now).
 *
 * Reuses lib/bookingApi.ts's `BookingStatus`/`statusGroup`/
 * `ACTIVE_STATUS_ORDER` rather than a second status vocabulary — a
 * technician's job and a customer's booking are the exact same underlying
 * Booking row, just viewed from the other side, so there's no reason for
 * the two to disagree on what "in progress" means or what counts as moving
 * forward.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class TechnicianJobsApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'TechnicianJobsApiError'
    this.status = status
  }
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/** Shared by every function below — same shape as technicianAuthApi.ts's
 *  own `request` (a local copy rather than an import, per this project's
 *  established convention of each API module owning its own small
 *  transport helper; see e.g. bookingApi.ts's own comment on this). CSRF
 *  only applies to unsafe methods, same reasoning as technicianAuthApi.ts. */
async function request<T>(method: 'GET' | 'PATCH', path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(method === 'GET' ? {} : { 'X-CSRFToken': getCsrfToken() }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new TechnicianJobsApiError('Network error. Check your connection and try again.')
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : null
    throw new TechnicianJobsApiError(detail ?? 'Something went wrong. Please try again.', response.status)
  }

  return data as T
}

export interface TechnicianJob {
  id: number
  bookingRef: string
  serviceName: string
  customerName: string
  addressLine: string
  city: string
  state: string
  pincode: string
  /** ISO yyyy-mm-dd. */
  bookingDate: string
  /** 24-hour HH:MM start of the chosen 2-hour arrival window — see
   *  data/bookingTimeSlots.ts (the customer-side booking form's own source
   *  for the same five options/labels; a technician's job and a
   *  customer's booking are the same underlying row, per this file's own
   *  header comment). */
  timeSlot: string
  timeSlotLabel: string
  status: BookingStatus
  statusLabel: string
  estimatedMinPrice: number
  estimatedMaxPrice: number
  complaint: string
}

interface TechnicianJobApiShape {
  id: number
  booking_ref: string
  service_name: string
  customer_name: string
  address_line: string
  city: string
  state: string
  pincode: string
  booking_date: string
  time_slot: string
  time_slot_label: string
  status: BookingStatus
  status_label: string
  estimated_min_price: number
  estimated_max_price: number
  complaint: string
}

function mapJob(data: TechnicianJobApiShape): TechnicianJob {
  return {
    id: data.id,
    bookingRef: data.booking_ref,
    serviceName: data.service_name,
    customerName: data.customer_name,
    addressLine: data.address_line,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    bookingDate: data.booking_date,
    timeSlot: data.time_slot,
    timeSlotLabel: data.time_slot_label,
    status: data.status,
    statusLabel: data.status_label,
    estimatedMinPrice: data.estimated_min_price,
    estimatedMaxPrice: data.estimated_max_price,
    complaint: data.complaint,
  }
}

// --- Demo mode (see demoMode.ts) — a small, self-contained, in-memory job
// store (list + detail derive from the same seed), following this file's
// own established convention of not sharing state across modules.

interface DemoJobSeed {
  id: number
  bookingRef: string
  serviceName: string
  customerName: string
  customerPhone: string
  addressLine: string
  city: string
  state: string
  pincode: string
  bookingDate: string
  timeSlot: string
  status: BookingStatus
  estimatedMinPrice: number
  estimatedMaxPrice: number
  complaint: string
  commissionAmount: number | null
  commissionPaid: boolean
  /** Hours-ago offsets for each tracking event, oldest first — same
   *  reasoning as bookingApi.ts's own demo seed. */
  historyHoursAgo: number[]
  historyStatuses: BookingStatus[]
}

function demoIsoDate(daysFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function demoIsoTimestamp(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
}

const demoJobs: DemoJobSeed[] = [
  {
    id: 201,
    bookingRef: 'UCBK2001',
    serviceName: 'AC Service',
    customerName: 'Priya Nair',
    customerPhone: '+919846011122',
    addressLine: '18, Panampilly Nagar',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682036',
    bookingDate: demoIsoDate(0),
    timeSlot: '09:00',
    status: 'in_progress',
    estimatedMinPrice: 499,
    estimatedMaxPrice: 799,
    complaint: 'AC is not cooling properly and makes a rattling noise.',
    commissionAmount: null,
    commissionPaid: false,
    historyHoursAgo: [4, 3, 2, 1, 0.3],
    historyStatuses: ['pending', 'confirmed', 'assigned', 'technician_on_the_way', 'in_progress'],
  },
  {
    id: 202,
    bookingRef: 'UCBK2002',
    serviceName: 'Washing Machine',
    customerName: 'Rahul Menon',
    customerPhone: '+919846022233',
    addressLine: '7, MG Road',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682016',
    bookingDate: demoIsoDate(0),
    timeSlot: '13:00',
    status: 'assigned',
    estimatedMinPrice: 399,
    estimatedMaxPrice: 699,
    complaint: 'Washing machine drum is not spinning.',
    commissionAmount: null,
    commissionPaid: false,
    historyHoursAgo: [5, 4],
    historyStatuses: ['pending', 'confirmed'],
  },
  {
    id: 203,
    bookingRef: 'UCBK2003',
    serviceName: 'Refrigerator',
    customerName: 'Sneha Thomas',
    customerPhone: '+919846033344',
    addressLine: '42, Kaloor',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682017',
    bookingDate: demoIsoDate(1),
    timeSlot: '11:00',
    status: 'assigned',
    estimatedMinPrice: 449,
    estimatedMaxPrice: 749,
    complaint: 'Refrigerator is making a loud noise.',
    commissionAmount: null,
    commissionPaid: false,
    historyHoursAgo: [6, 5],
    historyStatuses: ['pending', 'confirmed'],
  },
  {
    id: 204,
    bookingRef: 'UCBK2004',
    serviceName: 'Microwave',
    customerName: 'Vishnu Pillai',
    customerPhone: '+919846044455',
    addressLine: '3, Edappally',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682024',
    bookingDate: demoIsoDate(3),
    timeSlot: '15:00',
    status: 'assigned',
    estimatedMinPrice: 299,
    estimatedMaxPrice: 549,
    complaint: 'Microwave sparks inside when heating.',
    commissionAmount: null,
    commissionPaid: false,
    historyHoursAgo: [8, 7],
    historyStatuses: ['pending', 'confirmed'],
  },
  {
    id: 205,
    bookingRef: 'UCBK2005',
    serviceName: 'AC Service',
    customerName: 'Anjali Varma',
    customerPhone: '+919846055566',
    addressLine: '29, Fort Kochi',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682001',
    bookingDate: demoIsoDate(-5),
    timeSlot: '17:00',
    status: 'completed',
    estimatedMinPrice: 499,
    estimatedMaxPrice: 799,
    complaint: 'Annual AC maintenance and gas top-up.',
    commissionAmount: 150,
    commissionPaid: true,
    historyHoursAgo: [128, 127, 126, 125, 124, 123, 122],
    historyStatuses: [
      'pending',
      'confirmed',
      'assigned',
      'technician_on_the_way',
      'arrived',
      'in_progress',
      'completed',
    ],
  },
]

function demoJob(seed: DemoJobSeed): TechnicianJob {
  return {
    id: seed.id,
    bookingRef: seed.bookingRef,
    serviceName: seed.serviceName,
    customerName: seed.customerName,
    addressLine: seed.addressLine,
    city: seed.city,
    state: seed.state,
    pincode: seed.pincode,
    bookingDate: seed.bookingDate,
    timeSlot: seed.timeSlot,
    timeSlotLabel: demoTimeSlotLabel(seed.timeSlot),
    status: seed.status,
    statusLabel: bookingStatusLabels[seed.status],
    estimatedMinPrice: seed.estimatedMinPrice,
    estimatedMaxPrice: seed.estimatedMaxPrice,
    complaint: seed.complaint,
  }
}

function demoJobDetail(seed: DemoJobSeed): TechnicianJobDetail {
  return {
    ...demoJob(seed),
    customerPhone: seed.customerPhone,
    images: [],
    trackingHistory: seed.historyStatuses.map((status, index) => ({
      status,
      statusLabel: bookingStatusLabels[status],
      note: bookingStatusMessages[status],
      createdAt: demoIsoTimestamp(seed.historyHoursAgo[index]),
    })),
    commissionAmount: seed.commissionAmount,
    commissionPaid: seed.commissionPaid,
    updatedAt: demoIsoTimestamp(seed.historyHoursAgo[seed.historyHoursAgo.length - 1] ?? 0),
  }
}

/** The authenticated technician's own assigned bookings, in whatever order
 *  the backend returns (booking_date, then most-recently-created first). */
export async function getTechnicianJobs(): Promise<TechnicianJob[]> {
  if (DEMO_MODE) {
    await demoDelay()
    return demoJobs.map(demoJob)
  }
  const data = await request<TechnicianJobApiShape[]>('GET', '/api/technician/jobs/')
  return data.map(mapJob)
}

/** Everything a job's card view (TechnicianJob) has, plus what "View
 *  Details" shows beyond it. */
export interface TechnicianJobDetail extends TechnicianJob {
  customerPhone: string
  images: { id: number; imageUrl: string; uploadedAt: string }[]
  trackingHistory: { status: BookingStatus; statusLabel: string; note: string; createdAt: string }[]
  /** This job's own commission — both admin-set (see lib/
   *  technicianEarningsApi.ts's own header comment) and null/false until
   *  one is. */
  commissionAmount: number | null
  commissionPaid: boolean
  updatedAt: string
}

interface TechnicianJobDetailApiShape extends TechnicianJobApiShape {
  customer_phone: string
  images: { id: number; image: string; uploaded_at: string }[]
  tracking_history: { status: BookingStatus; status_label: string; note: string; created_at: string }[]
  commission_amount: string | null
  commission_paid: boolean
  updated_at: string
}

function mapJobDetail(data: TechnicianJobDetailApiShape): TechnicianJobDetail {
  return {
    ...mapJob(data),
    customerPhone: data.customer_phone,
    // `image` is the API's MEDIA_URL-relative path — same absolute-URL
    // mapping bookingApi.ts's own mapBookingDetail already does for the
    // customer side's booking images.
    images: data.images.map((image) => ({
      id: image.id,
      imageUrl: `${API_BASE_URL}${image.image}`,
      uploadedAt: image.uploaded_at,
    })),
    trackingHistory: data.tracking_history.map((event) => ({
      status: event.status,
      statusLabel: event.status_label,
      note: event.note,
      createdAt: event.created_at,
    })),
    // A DecimalField serializes as a string (or null) — Number(...), same
    // reasoning as lib/technicianEarningsApi.ts's own mapEarnings.
    commissionAmount: data.commission_amount === null ? null : Number(data.commission_amount),
    commissionPaid: data.commission_paid,
    updatedAt: data.updated_at,
  }
}

/** GET /api/technician/jobs/<id>/ — the full detail behind "View Details"
 *  on a job card. 404s (surfaced as a rejected promise) for a job that
 *  doesn't exist or isn't assigned to this technician, same as every other
 *  ownership-checked detail endpoint in this project. */
export async function getTechnicianJobDetail(id: number): Promise<TechnicianJobDetail> {
  if (DEMO_MODE) {
    await demoDelay()
    const seed = demoJobs.find((job) => job.id === id)
    if (!seed) throw new TechnicianJobsApiError('Job not found.', 404)
    return demoJobDetail(seed)
  }
  const data = await request<TechnicianJobDetailApiShape>('GET', `/api/technician/jobs/${id}/`)
  return mapJobDetail(data)
}

/** The one status a job can advance to next, or null if it's already at
 *  the end of the line (completed) or off it entirely (cancelled) — mirrors
 *  backend/bookings/serializers.py's TechnicianJobStatusUpdateSerializer,
 *  which enforces the exact same single-forward-step rule server-side
 *  regardless of what this suggests client-side. */
export function nextJobStatus(currentStatus: BookingStatus): BookingStatus | null {
  const index = ACTIVE_STATUS_ORDER.indexOf(currentStatus as (typeof ACTIVE_STATUS_ORDER)[number])
  if (index === -1 || index === ACTIVE_STATUS_ORDER.length - 1) return null
  return ACTIVE_STATUS_ORDER[index + 1]
}

/** Action-button copy for advancing a job TO each status — a technician
 *  doing the job thinks in verbs ("Start Journey"), not the noun status
 *  labels bookingStatusLabels uses for display everywhere else. Every key
 *  here is a status nextJobStatus can actually return (never 'pending'/
 *  'confirmed'/'assigned'/'cancelled' — a technician's own job list never
 *  starts before 'assigned', and 'cancelled' is never a next step). */
export const nextStatusActionLabels: Partial<Record<BookingStatus, string>> = {
  technician_on_the_way: 'Start Journey',
  arrived: 'Mark as Arrived',
  in_progress: 'Start Service',
  completed: 'Mark as Completed',
}

/** PATCH /api/technician/jobs/<id>/status/ — advances a job one step
 *  forward. Returns the same card-view shape getTechnicianJobs does (the
 *  backend's technician_job_update_status responds with
 *  TechnicianJobSerializer, not the detail shape), so callers can patch a
 *  job list in place with the result. */
export async function updateTechnicianJobStatus(id: number, status: BookingStatus): Promise<TechnicianJob> {
  if (DEMO_MODE) {
    await demoDelay()
    const seed = demoJobs.find((job) => job.id === id)
    if (!seed) throw new TechnicianJobsApiError('Job not found.', 404)
    seed.status = status
    seed.historyStatuses.push(status)
    seed.historyHoursAgo.push(0)
    return demoJob(seed)
  }
  const data = await request<TechnicianJobApiShape>('PATCH', `/api/technician/jobs/${id}/status/`, { status })
  return mapJob(data)
}

/** "Not yet completed or cancelled" — pending/confirmed/assigned/
 *  technician_on_the_way/arrived/in_progress all count, matching
 *  statusGroup's own 'upcoming'/'in-progress' groups. Used by Today's Jobs
 *  and Upcoming Jobs, which only ever show work still ahead of the
 *  technician. */
export function isJobOutstanding(job: TechnicianJob): boolean {
  const group = statusGroup(job.status)
  return group === 'upcoming' || group === 'in-progress'
}

// --- Date-bucket helpers for Upcoming Jobs (Today/Tomorrow/This Week) and
// Job History (Today/This Week/This Month) filters — computed against the
// real current date and a job's real `bookingDate`.

function localDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseLocalDate(toIso).getTime() - parseLocalDate(fromIso).getTime()) / 86_400_000)
}

export function isJobToday(iso: string): boolean {
  return iso === localDateOnly(new Date())
}

export function isJobTomorrow(iso: string): boolean {
  return daysBetween(localDateOnly(new Date()), iso) === 1
}

/** Inclusive of today, up to 6 days ahead (a 7-day window). */
export function isJobThisWeek(iso: string): boolean {
  const diff = daysBetween(localDateOnly(new Date()), iso)
  return diff >= 0 && diff <= 6
}

/** Same calendar month/year as today — used by Job History, which looks
 *  backward (completed jobs), unlike the other helpers above which look
 *  forward (scheduled jobs). */
export function isJobThisMonth(iso: string): boolean {
  const today = new Date()
  const jobDate = parseLocalDate(iso)
  return jobDate.getFullYear() === today.getFullYear() && jobDate.getMonth() === today.getMonth()
}
