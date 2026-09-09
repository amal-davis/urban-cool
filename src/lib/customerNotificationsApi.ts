/**
 * Authenticated customer notifications API — GET /api/customer/
 * notifications/, PATCH /api/customer/notifications/{id}/read/, and POST
 * /api/customer/notifications/mark-all-read/ (backend/bookings, see that
 * app's views.py's customer_notifications / customer_notification_mark_read
 * / customer_notifications_mark_all_read). Real, backend-fetched data:
 * every row is created automatically by Booking.save() (see
 * CustomerNotification's own docstring) whenever the customer's own booking
 * hits a customer-relevant milestone — there is no separate "send a
 * notification" call anywhere for this to fall out of sync with.
 *
 * Same session-cookie + CSRF-header pattern as customerApi.ts — see that
 * file's own comment for why (this is a second, small local copy of
 * getCsrfToken()/the error class/the request() shape rather than an import,
 * per this project's established convention of not sharing small snippets
 * across files).
 *
 * Backs NotificationBell (components/Navbar/NotificationBell.tsx), the site
 * header's bell button — kept as its own module (not folded into
 * customerApi.ts) the same way lib/bookingApi.ts is already split out, so
 * a future swap to push-based delivery (see that component's own comment)
 * only ever touches this one file.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class CustomerNotificationsApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'CustomerNotificationsApiError'
    this.status = status
  }
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function request<T>(method: 'GET' | 'PATCH' | 'POST', path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: method === 'GET' ? {} : { 'X-CSRFToken': getCsrfToken() },
    })
  } catch {
    throw new CustomerNotificationsApiError('Network error. Check your connection and try again.')
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : null
    throw new CustomerNotificationsApiError(detail ?? 'Something went wrong. Please try again.', response.status)
  }

  return data as T
}

export type CustomerNotificationType =
  | 'booking_created'
  | 'technician_assigned'
  | 'booking_accepted'
  | 'technician_on_the_way'
  | 'service_started'
  | 'service_completed'
  | 'booking_cancelled'

export interface CustomerNotification {
  id: number
  type: CustomerNotificationType
  typeLabel: string
  title: string
  message: string
  /** null for the (currently theoretical) case of a notification with no
   *  booking behind it — see CustomerNotification's own docstring. */
  bookingId: number | null
  bookingRef: string | null
  isRead: boolean
  createdAt: string
}

export interface CustomerNotificationsResult {
  /** Every unread notification this customer has, not capped at whatever
   *  `results` holds — what the bell's badge count should read. */
  unreadCount: number
  /** The most recent notifications (backend/bookings/views.py's
   *  CUSTOMER_NOTIFICATION_LIST_LIMIT), newest first. */
  results: CustomerNotification[]
}

interface CustomerNotificationApiShape {
  id: number
  type: CustomerNotificationType
  type_label: string
  title: string
  message: string
  booking_id: number | null
  booking_ref: string | null
  is_read: boolean
  created_at: string
}

interface CustomerNotificationsApiShape {
  unread_count: number
  results: CustomerNotificationApiShape[]
}

function mapNotification(data: CustomerNotificationApiShape): CustomerNotification {
  return {
    id: data.id,
    type: data.type,
    typeLabel: data.type_label,
    title: data.title,
    message: data.message,
    bookingId: data.booking_id,
    bookingRef: data.booking_ref,
    isRead: data.is_read,
    createdAt: data.created_at,
  }
}

export async function getCustomerNotifications(): Promise<CustomerNotificationsResult> {
  const data = await request<CustomerNotificationsApiShape>('GET', '/api/customer/notifications/')
  return {
    unreadCount: data.unread_count,
    results: data.results.map(mapNotification),
  }
}

/** Marks one notification read — called when the customer clicks it (before
 *  navigating to its booking, if it has one). */
export async function markCustomerNotificationRead(id: number): Promise<CustomerNotification> {
  const data = await request<CustomerNotificationApiShape>('PATCH', `/api/customer/notifications/${id}/read/`)
  return mapNotification(data)
}

/** Marks every one of this customer's unread notifications as read — called
 *  from the panel's own "Mark all as read" button. */
export async function markAllCustomerNotificationsRead(): Promise<void> {
  await request<{ detail: string }>('POST', '/api/customer/notifications/mark-all-read/')
}
