/**
 * Authenticated customer booking API (backend/bookings, under
 * /api/customer/bookings/*). Kept isolated like lib/customerApi.ts:
 * callers only ever call these functions and handle whatever they
 * resolve/reject with, so swapping the transport later never touches UI
 * code. Same session-cookie + CSRF-header pattern as customerApi.ts — see
 * that file's own comment for why (this is a second, small local copy of
 * getCsrfToken()/the error class rather than an import, per this project's
 * established convention of not sharing small snippets across files).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class BookingApiError extends Error {
  code?: string
  status?: number

  constructor(message: string, opts: { code?: string; status?: number } = {}) {
    super(message)
    this.name = 'BookingApiError'
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

async function handleResponse<T>(response: Response): Promise<T> {
  let data: (ApiErrorBody & Record<string, unknown>) | null = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    throw new BookingApiError(data?.detail ?? 'Something went wrong. Please try again.', {
      code: data?.code,
      status: response.status,
    })
  }

  return data as T
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: 'GET', credentials: 'include' })
  } catch {
    throw new BookingApiError('Network error. Check your connection and try again.', { code: 'network_error' })
  }
  return handleResponse<T>(response)
}

// --- Types ---

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'technician_on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  technician_on_the_way: 'Technician On The Way',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** One line of plain-language status copy for the tracking page — pulled
 *  from here, never hardcoded per status in a component. */
export const bookingStatusMessages: Record<BookingStatus, string> = {
  pending: 'Your service request has been received.',
  confirmed: 'Your booking has been confirmed.',
  assigned: 'A technician has been assigned to your service.',
  technician_on_the_way: 'Your technician is on the way.',
  arrived: 'Your technician has arrived at your location.',
  in_progress: 'Your service is currently in progress.',
  completed: 'Your service has been completed.',
  cancelled: 'This booking has been cancelled.',
}

/** The non-cancelled lifecycle, in order — mirrors
 *  backend/bookings/models.py's Booking.ACTIVE_STATUS_ORDER exactly (same
 *  name, same order) so the tracking timeline and the backend's own idea
 *  of "what counts as moving forward" never drift apart. `cancelled` is
 *  deliberately excluded — it isn't a step in a linear progression, it's a
 *  separate outcome the tracking page renders as its own distinct panel
 *  (see ServiceTrackingPage.tsx), never mixed into this timeline. */
export const ACTIVE_STATUS_ORDER: Exclude<BookingStatus, 'cancelled'>[] = [
  'pending',
  'confirmed',
  'assigned',
  'technician_on_the_way',
  'arrived',
  'in_progress',
  'completed',
]

/** The dashboard's existing 4-tab filter/color grouping (StatusBadge.css
 *  already has exactly these 4 color tokens) — collapses the 8 real
 *  backend statuses onto it rather than adding more colors: pending/
 *  confirmed/assigned haven't reached the customer's door yet ("upcoming");
 *  technician_on_the_way/arrived/in_progress all mean "happening right now"
 *  (StatusBadge.css's own comment already ties its amber token to
 *  "technician en route"). */
export type BookingStatusGroup = 'upcoming' | 'in-progress' | 'completed' | 'cancelled'

export function statusGroup(status: BookingStatus): BookingStatusGroup {
  switch (status) {
    case 'technician_on_the_way':
    case 'arrived':
    case 'in_progress':
      return 'in-progress'
    case 'completed':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'upcoming'
  }
}

/** "2026-09-15" -> "15 Sep 2026". */
export function formatBookingDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Always a range, never a single figure — this is an *estimate*, and
 *  labeling/formatting it any other way risks reading as a final price
 *  (see backend/bookings/models.py's own estimated_min_price/
 *  estimated_max_price comment). */
export function formatEstimatedCost(minPrice: number, maxPrice: number): string {
  return `₹${minPrice.toLocaleString('en-IN')} – ₹${maxPrice.toLocaleString('en-IN')}`
}

export function formatBookingAddress(booking: Pick<BookingListItem, 'addressLine' | 'city' | 'state' | 'pincode'>): string {
  return `${booking.addressLine}, ${booking.city}, ${booking.state} - ${booking.pincode}`
}

export interface BookingListItem {
  id: number
  bookingRef: string
  serviceSlug: string
  serviceName: string
  bookingDate: string
  /** 24-hour HH:MM start of the chosen 2-hour arrival window, e.g. "09:00"
   *  — see data/bookingTimeSlots.ts, the single source of the five options
   *  and their display labels. `timeSlotLabel` alongside it is the ready-
   *  formatted label straight from the backend (matches timeSlotLabel()
   *  there), so most callers never need to look the value up themselves. */
  timeSlot: string
  timeSlotLabel: string
  addressLine: string
  city: string
  state: string
  pincode: string
  estimatedMinPrice: number
  estimatedMaxPrice: number
  status: BookingStatus
  createdAt: string
}

export interface BookingImageItem {
  id: number
  imageUrl: string
  uploadedAt: string
}

export interface BookingDetail extends BookingListItem {
  latitude: number | null
  longitude: number | null
  complaint: string
  images: BookingImageItem[]
  /** Both null until an admin assigns a technician — see
   *  backend/bookings/serializers.py's BookingDetailSerializer. */
  technicianName: string | null
  technicianPhone: string | null
  updatedAt: string
}

interface BookingListApiShape {
  id: number
  booking_ref: string
  service_slug: string
  service_name: string
  booking_date: string
  time_slot: string
  time_slot_label: string
  address_line: string
  city: string
  state: string
  pincode: string
  estimated_min_price: number
  estimated_max_price: number
  status: BookingStatus
  created_at: string
}

interface BookingDetailApiShape extends BookingListApiShape {
  latitude: string | number | null
  longitude: string | number | null
  complaint: string
  images: { id: number; image: string; uploaded_at: string }[]
  technician_name: string | null
  technician_phone: string | null
  updated_at: string
}

function mapBookingListItem(data: BookingListApiShape): BookingListItem {
  return {
    id: data.id,
    bookingRef: data.booking_ref,
    serviceSlug: data.service_slug,
    serviceName: data.service_name,
    bookingDate: data.booking_date,
    timeSlot: data.time_slot,
    timeSlotLabel: data.time_slot_label,
    addressLine: data.address_line,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    estimatedMinPrice: data.estimated_min_price,
    estimatedMaxPrice: data.estimated_max_price,
    status: data.status,
    createdAt: data.created_at,
  }
}

function mapBookingDetail(data: BookingDetailApiShape): BookingDetail {
  return {
    ...mapBookingListItem(data),
    latitude: data.latitude === null ? null : Number(data.latitude),
    longitude: data.longitude === null ? null : Number(data.longitude),
    complaint: data.complaint,
    // `image` is the API's MEDIA_URL-relative path (e.g.
    // "/media/bookings/2026/09/photo.jpg") — API_BASE_URL is the same
    // origin the rest of this file already talks to, so this is enough to
    // make it a fetchable absolute URL from the frontend's own origin.
    images: data.images.map((image) => ({
      id: image.id,
      imageUrl: `${API_BASE_URL}${image.image}`,
      uploadedAt: image.uploaded_at,
    })),
    technicianName: data.technician_name,
    technicianPhone: data.technician_phone,
    updatedAt: data.updated_at,
  }
}

// --- Requests ---

export async function getMyBookings(): Promise<BookingListItem[]> {
  const data = await getJson<BookingListApiShape[]>('/api/customer/bookings/')
  return data.map(mapBookingListItem)
}

export async function getBookingDetail(id: number): Promise<BookingDetail> {
  const data = await getJson<BookingDetailApiShape>(`/api/customer/bookings/${id}/`)
  return mapBookingDetail(data)
}

export interface CreateBookingPayload {
  service: string
  bookingDate: string
  bookingTime: string
  addressLine: string
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  complaint: string
}

/** `images` are real Files (see data/booking.ts's BookingImageFile) — this
 *  builds FormData and deliberately never sets Content-Type itself, so the
 *  browser attaches the correct multipart boundary. */
export async function createBooking(payload: CreateBookingPayload, images: File[]): Promise<BookingDetail> {
  const formData = new FormData()
  formData.append('service', payload.service)
  formData.append('booking_date', payload.bookingDate)
  formData.append('time_slot', payload.bookingTime)
  formData.append('address_line', payload.addressLine)
  formData.append('city', payload.city)
  formData.append('state', payload.state)
  formData.append('pincode', payload.pincode)
  if (payload.latitude !== null) formData.append('latitude', String(payload.latitude))
  if (payload.longitude !== null) formData.append('longitude', String(payload.longitude))
  formData.append('complaint', payload.complaint)
  for (const image of images) {
    formData.append('images', image)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/customer/bookings/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrfToken() },
      body: formData,
    })
  } catch {
    throw new BookingApiError('Network error. Check your connection and try again.', { code: 'network_error' })
  }

  return handleResponse<BookingDetailApiShape>(response).then(mapBookingDetail)
}

// --- Tracking ---

export interface TrackingHistoryEvent {
  status: BookingStatus
  statusLabel: string
  note: string
  createdAt: string
}

export interface BookingTracking {
  id: number
  bookingRef: string
  serviceName: string
  bookingDate: string
  timeSlot: string
  timeSlotLabel: string
  status: BookingStatus
  statusLabel: string
  addressLine: string
  city: string
  state: string
  pincode: string
  /** The service address's own coordinates (where service was requested) —
   *  both null if the customer never pinned a location at booking time
   *  (Google Maps was never mandatory — see LocationPicker.tsx). */
  latitude: number | null
  longitude: number | null
  estimatedMinPrice: number
  estimatedMaxPrice: number
  /** Both null until an admin assigns a technician. */
  technicianName: string | null
  technicianPhone: string | null
  /** The technician's current position during an active job — distinct
   *  from latitude/longitude above. All three stay null until something
   *  actually sets them; never fabricated. */
  technicianLatitude: number | null
  technicianLongitude: number | null
  locationUpdatedAt: string | null
  trackingHistory: TrackingHistoryEvent[]
}

interface BookingTrackingApiShape {
  id: number
  booking_ref: string
  service_name: string
  booking_date: string
  time_slot: string
  time_slot_label: string
  status: BookingStatus
  status_label: string
  address_line: string
  city: string
  state: string
  pincode: string
  latitude: string | number | null
  longitude: string | number | null
  estimated_min_price: number
  estimated_max_price: number
  technician_name: string | null
  technician_phone: string | null
  technician_latitude: string | number | null
  technician_longitude: string | number | null
  location_updated_at: string | null
  tracking_history: { status: BookingStatus; status_label: string; note: string; created_at: string }[]
}

function mapBookingTracking(data: BookingTrackingApiShape): BookingTracking {
  return {
    id: data.id,
    bookingRef: data.booking_ref,
    serviceName: data.service_name,
    bookingDate: data.booking_date,
    timeSlot: data.time_slot,
    timeSlotLabel: data.time_slot_label,
    status: data.status,
    statusLabel: data.status_label,
    addressLine: data.address_line,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    latitude: data.latitude === null ? null : Number(data.latitude),
    longitude: data.longitude === null ? null : Number(data.longitude),
    estimatedMinPrice: data.estimated_min_price,
    estimatedMaxPrice: data.estimated_max_price,
    technicianName: data.technician_name,
    technicianPhone: data.technician_phone,
    technicianLatitude: data.technician_latitude === null ? null : Number(data.technician_latitude),
    technicianLongitude: data.technician_longitude === null ? null : Number(data.technician_longitude),
    locationUpdatedAt: data.location_updated_at,
    trackingHistory: data.tracking_history.map((event) => ({
      status: event.status,
      statusLabel: event.status_label,
      note: event.note,
      createdAt: event.created_at,
    })),
  }
}

export async function getBookingTracking(id: number): Promise<BookingTracking> {
  const data = await getJson<BookingTrackingApiShape>(`/api/customer/bookings/${id}/tracking/`)
  return mapBookingTracking(data)
}
