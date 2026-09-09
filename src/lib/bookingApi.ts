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
import { services as demoServiceList } from '../data/services'
import { timeSlotLabel } from '../data/bookingTimeSlots'
import { DEMO_MODE, demoDelay, nextDemoId } from './demoMode'

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

// --- Demo mode (see demoMode.ts) — a small, self-contained, in-memory
// booking store (list + detail + tracking all derive from the same seed, so
// the three views of one booking can never disagree), following this
// file's own established convention of not sharing state across modules.

interface DemoBookingSeed {
  id: number
  bookingRef: string
  serviceSlug: string
  serviceName: string
  /** ISO yyyy-mm-dd. */
  bookingDate: string
  timeSlot: string
  addressLine: string
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  estimatedMinPrice: number
  estimatedMaxPrice: number
  complaint: string
  status: BookingStatus
  technicianName: string | null
  technicianPhone: string | null
  technicianLatitude: number | null
  technicianLongitude: number | null
  /** Hours-ago offsets for each tracking event, oldest first — paired 1:1
   *  with `historyStatuses`. Also doubles as createdAt (first entry) and
   *  updatedAt (last entry). */
  historyHoursAgo: number[]
  historyStatuses: BookingStatus[]
}

function isoDate(daysFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoTimestamp(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
}

const DEMO_ADDRESS = {
  addressLine: '24/A, Marine Drive Road',
  city: 'Kochi',
  state: 'Kerala',
  pincode: '682031',
  latitude: 9.9658,
  longitude: 76.2421,
}

const DEMO_TECHNICIAN = { name: 'Arun Kumar', phone: '+919847012345', latitude: 9.9312, longitude: 76.2673 }

let demoBookings: DemoBookingSeed[] = [
  {
    id: 101,
    bookingRef: 'UCBK1001',
    serviceSlug: 'ac',
    serviceName: 'AC Service',
    bookingDate: isoDate(0),
    timeSlot: '11:00',
    ...DEMO_ADDRESS,
    estimatedMinPrice: 499,
    estimatedMaxPrice: 799,
    complaint: 'AC is cooling poorly and making a rattling noise.',
    status: 'technician_on_the_way',
    technicianName: DEMO_TECHNICIAN.name,
    technicianPhone: DEMO_TECHNICIAN.phone,
    technicianLatitude: DEMO_TECHNICIAN.latitude,
    technicianLongitude: DEMO_TECHNICIAN.longitude,
    historyHoursAgo: [3, 2.5, 2, 0.2],
    historyStatuses: ['pending', 'confirmed', 'assigned', 'technician_on_the_way'],
  },
  {
    id: 102,
    bookingRef: 'UCBK1002',
    serviceSlug: 'washing-machine',
    serviceName: 'Washing Machine',
    bookingDate: isoDate(-6),
    timeSlot: '15:00',
    ...DEMO_ADDRESS,
    estimatedMinPrice: 399,
    estimatedMaxPrice: 699,
    complaint: 'Washing machine is not draining properly.',
    status: 'completed',
    technicianName: DEMO_TECHNICIAN.name,
    technicianPhone: DEMO_TECHNICIAN.phone,
    technicianLatitude: DEMO_ADDRESS.latitude,
    technicianLongitude: DEMO_ADDRESS.longitude,
    historyHoursAgo: [150, 149, 148, 147, 146, 145, 144],
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
  {
    id: 103,
    bookingRef: 'UCBK1003',
    serviceSlug: 'refrigerator',
    serviceName: 'Refrigerator',
    bookingDate: isoDate(3),
    timeSlot: '09:00',
    ...DEMO_ADDRESS,
    estimatedMinPrice: 449,
    estimatedMaxPrice: 749,
    complaint: 'Refrigerator is not cooling enough and has frost build-up.',
    status: 'confirmed',
    technicianName: null,
    technicianPhone: null,
    technicianLatitude: null,
    technicianLongitude: null,
    historyHoursAgo: [1, 0.5],
    historyStatuses: ['pending', 'confirmed'],
  },
  {
    id: 104,
    bookingRef: 'UCBK1004',
    serviceSlug: 'microwave',
    serviceName: 'Microwave',
    bookingDate: isoDate(-10),
    timeSlot: '13:00',
    ...DEMO_ADDRESS,
    estimatedMinPrice: 299,
    estimatedMaxPrice: 549,
    complaint: 'Microwave is not heating food.',
    status: 'cancelled',
    technicianName: null,
    technicianPhone: null,
    technicianLatitude: null,
    technicianLongitude: null,
    historyHoursAgo: [240, 239, 238],
    historyStatuses: ['pending', 'confirmed', 'cancelled'],
  },
]

function demoListItem(seed: DemoBookingSeed): BookingListItem {
  return {
    id: seed.id,
    bookingRef: seed.bookingRef,
    serviceSlug: seed.serviceSlug,
    serviceName: seed.serviceName,
    bookingDate: seed.bookingDate,
    timeSlot: seed.timeSlot,
    timeSlotLabel: timeSlotLabel(seed.timeSlot),
    addressLine: seed.addressLine,
    city: seed.city,
    state: seed.state,
    pincode: seed.pincode,
    estimatedMinPrice: seed.estimatedMinPrice,
    estimatedMaxPrice: seed.estimatedMaxPrice,
    status: seed.status,
    createdAt: isoTimestamp(seed.historyHoursAgo[0] ?? 0),
  }
}

function demoDetail(seed: DemoBookingSeed): BookingDetail {
  return {
    ...demoListItem(seed),
    latitude: seed.latitude,
    longitude: seed.longitude,
    complaint: seed.complaint,
    images: [],
    technicianName: seed.technicianName,
    technicianPhone: seed.technicianPhone,
    updatedAt: isoTimestamp(seed.historyHoursAgo[seed.historyHoursAgo.length - 1] ?? 0),
  }
}

function demoTracking(seed: DemoBookingSeed): BookingTracking {
  return {
    id: seed.id,
    bookingRef: seed.bookingRef,
    serviceName: seed.serviceName,
    bookingDate: seed.bookingDate,
    timeSlot: seed.timeSlot,
    timeSlotLabel: timeSlotLabel(seed.timeSlot),
    status: seed.status,
    statusLabel: bookingStatusLabels[seed.status],
    addressLine: seed.addressLine,
    city: seed.city,
    state: seed.state,
    pincode: seed.pincode,
    latitude: seed.latitude,
    longitude: seed.longitude,
    estimatedMinPrice: seed.estimatedMinPrice,
    estimatedMaxPrice: seed.estimatedMaxPrice,
    technicianName: seed.technicianName,
    technicianPhone: seed.technicianPhone,
    technicianLatitude: seed.technicianLatitude,
    technicianLongitude: seed.technicianLongitude,
    locationUpdatedAt: seed.technicianName ? isoTimestamp(seed.historyHoursAgo[seed.historyHoursAgo.length - 1] ?? 0) : null,
    trackingHistory: seed.historyStatuses.map((status, index) => ({
      status,
      statusLabel: bookingStatusLabels[status],
      note: bookingStatusMessages[status],
      createdAt: isoTimestamp(seed.historyHoursAgo[index]),
    })),
  }
}

// --- Requests ---

export async function getMyBookings(): Promise<BookingListItem[]> {
  if (DEMO_MODE) {
    await demoDelay()
    return demoBookings.map(demoListItem)
  }
  const data = await getJson<BookingListApiShape[]>('/api/customer/bookings/')
  return data.map(mapBookingListItem)
}

export async function getBookingDetail(id: number): Promise<BookingDetail> {
  if (DEMO_MODE) {
    await demoDelay()
    const seed = demoBookings.find((booking) => booking.id === id)
    if (!seed) throw new BookingApiError('Booking not found.', { status: 404 })
    return demoDetail(seed)
  }
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
  if (DEMO_MODE) {
    await demoDelay()
    const matchedService = demoServiceList.find((service) => service.id === payload.service)
    const id = nextDemoId()
    const seed: DemoBookingSeed = {
      id,
      bookingRef: `UCBK${id}`,
      serviceSlug: payload.service,
      serviceName: matchedService?.name ?? payload.service,
      bookingDate: payload.bookingDate,
      timeSlot: payload.bookingTime,
      addressLine: payload.addressLine,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      latitude: payload.latitude,
      longitude: payload.longitude,
      estimatedMinPrice: matchedService?.startingPrice ?? 399,
      estimatedMaxPrice: matchedService?.estimatedPriceTo ?? (matchedService?.startingPrice ?? 399) + 300,
      complaint: payload.complaint,
      status: 'pending',
      technicianName: null,
      technicianPhone: null,
      technicianLatitude: null,
      technicianLongitude: null,
      historyHoursAgo: [0],
      historyStatuses: ['pending'],
    }
    // New bookings first, same as a real "most-recently-created first" list.
    demoBookings = [seed, ...demoBookings]
    const detail = demoDetail(seed)
    // Real File objects were actually chosen — preview them via object URLs
    // rather than dropping them, so the success/detail view shows exactly
    // what was just "uploaded" instead of an empty gallery. (Never revoked —
    // a demo session is short-lived and this is the one place these files
    // are ever shown.)
    detail.images = images.map((file, index) => ({
      id: index + 1,
      imageUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    }))
    return detail
  }

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
  if (DEMO_MODE) {
    await demoDelay()
    const seed = demoBookings.find((booking) => booking.id === id)
    if (!seed) throw new BookingApiError('Booking not found.', { status: 404 })
    return demoTracking(seed)
  }
  const data = await getJson<BookingTrackingApiShape>(`/api/customer/bookings/${id}/tracking/`)
  return mapBookingTracking(data)
}
