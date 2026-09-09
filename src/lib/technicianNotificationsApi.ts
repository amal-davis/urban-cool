/**
 * Technician notifications API — GET /api/technician/notifications/ and
 * POST /api/technician/notifications/mark-read/ (backend/bookings, see
 * that app's views.py's technician_notifications/technician_notifications_
 * mark_read). Real, backend-fetched data: every row is created
 * automatically by Booking.save() (see that model's own docstring)
 * whenever a job lands on this technician or one of their jobs' status
 * changes — there is no separate "send a notification" call anywhere for
 * this to fall out of sync with.
 *
 * Backs NotificationBell (components/TechnicianDashboard/NotificationBell.tsx),
 * the technician header's bell button.
 */

import { DEMO_MODE, demoDelay } from './demoMode'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class TechnicianNotificationsApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'TechnicianNotificationsApiError'
    this.status = status
  }
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function request<T>(method: 'GET' | 'POST', path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: method === 'GET' ? {} : { 'X-CSRFToken': getCsrfToken() },
    })
  } catch {
    throw new TechnicianNotificationsApiError('Network error. Check your connection and try again.')
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : null
    throw new TechnicianNotificationsApiError(detail ?? 'Something went wrong. Please try again.', response.status)
  }

  return data as T
}

export type TechnicianNotificationType = 'assigned' | 'status_update' | 'commission_updated'

export interface TechnicianNotification {
  id: number
  type: TechnicianNotificationType
  typeLabel: string
  message: string
  bookingRef: string
  isRead: boolean
  createdAt: string
}

export interface TechnicianNotificationsResult {
  /** Every unread notification this technician has, not capped at the 5-7
   *  shown in `results` — what the bell's badge count should read. */
  unreadCount: number
  /** The most recent 5-7 (backend/bookings/views.py's
   *  NOTIFICATION_LIST_LIMIT), newest first. */
  results: TechnicianNotification[]
}

interface TechnicianNotificationApiShape {
  id: number
  type: TechnicianNotificationType
  type_label: string
  message: string
  booking_ref: string
  is_read: boolean
  created_at: string
}

interface TechnicianNotificationsApiShape {
  unread_count: number
  results: TechnicianNotificationApiShape[]
}

function mapNotification(data: TechnicianNotificationApiShape): TechnicianNotification {
  return {
    id: data.id,
    type: data.type,
    typeLabel: data.type_label,
    message: data.message,
    bookingRef: data.booking_ref,
    isRead: data.is_read,
    createdAt: data.created_at,
  }
}

// Demo mode (see demoMode.ts) — references the same booking refs as
// technicianJobsApi.ts's own demo jobs, so clicking through reads as one
// consistent story rather than two unrelated mock datasets.
const demoNotifications: TechnicianNotification[] = [
  {
    id: 1,
    type: 'assigned',
    typeLabel: 'New Job Assigned',
    message: 'You have been assigned a new AC Service job (UCBK2001).',
    bookingRef: 'UCBK2001',
    isRead: false,
    createdAt: new Date(Date.now() - 4 * 3_600_000).toISOString(),
  },
  {
    id: 2,
    type: 'status_update',
    typeLabel: 'Job Status Updated',
    message: 'Booking UCBK2001 moved to In Progress.',
    bookingRef: 'UCBK2001',
    isRead: false,
    createdAt: new Date(Date.now() - 0.3 * 3_600_000).toISOString(),
  },
  {
    id: 3,
    type: 'commission_updated',
    typeLabel: 'Commission Updated',
    message: 'A ₹150 commission was set for booking UCBK2005.',
    bookingRef: 'UCBK2005',
    isRead: true,
    createdAt: new Date(Date.now() - 120 * 3_600_000).toISOString(),
  },
]

export async function getTechnicianNotifications(): Promise<TechnicianNotificationsResult> {
  if (DEMO_MODE) {
    await demoDelay()
    return {
      unreadCount: demoNotifications.filter((notification) => !notification.isRead).length,
      results: demoNotifications,
    }
  }
  const data = await request<TechnicianNotificationsApiShape>('GET', '/api/technician/notifications/')
  return {
    unreadCount: data.unread_count,
    results: data.results.map(mapNotification),
  }
}

/** Marks every one of this technician's unread notifications as read (not
 *  just the ones currently shown) — called when the panel is opened, to
 *  clear the bell's badge. */
export async function markTechnicianNotificationsRead(): Promise<void> {
  if (DEMO_MODE) {
    await demoDelay()
    for (const notification of demoNotifications) notification.isRead = true
    return
  }
  await request<{ detail: string }>('POST', '/api/technician/notifications/mark-read/')
}
