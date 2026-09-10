/**
 * Public services API (backend/bookings, under /api/services/*) — backs the
 * Services page, the Service Detail page, and the Booking page's service
 * lookup. Kept isolated like lib/bookingApi.ts/lib/contactApi.ts: callers
 * only ever call getServices()/getServiceDetail() and handle whatever they
 * resolve/reject with, so swapping the transport later never touches UI
 * code. No `credentials: 'include'` here, same reasoning as contactApi.ts —
 * this is a public, unauthenticated read, not session-scoped.
 *
 * Both functions resolve to this project's existing `Service` shape
 * (data/services.ts) rather than a new API-specific type, so every existing
 * component that already renders a Service (ServiceDetail, ServiceImage,
 * IncludedServices, EstimatedPrice, BookingCTA, BookingSummary,
 * BookingReview, BookingSuccess) needs no change to render backend-driven
 * services too — see mapApiService below for the field-by-field mapping.
 */
import type { Service } from '../data/services'
import { services as demoServices } from '../data/services'
import { DEMO_MODE, demoDelay } from './demoMode'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ServicesApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ServicesApiError'
    this.status = status
  }
}

interface ApiErrorBody {
  detail?: string
}

interface ServiceFeatureApiShape {
  id: number
  title: string
}

interface ServiceListApiShape {
  id: string
  slug: string
  name: string
  short_description: string
  image: string | null
  estimated_price_from: number
  estimated_price_to: number
}

interface ServiceDetailApiShape extends ServiceListApiShape {
  full_description: string
  features: ServiceFeatureApiShape[]
}

/** Maps one backend service (list or detail shape) onto this project's
 *  existing `Service` type. `Icon` is deliberately omitted (left
 *  `undefined`) — every component that renders a Service already prefers a
 *  real `imageUrl` over `Icon`, and the backend always provides one (see
 *  ServiceImage.tsx), so no icon-based fallback is ever needed here. The
 *  same `features` list backs both `helpWith` (Services page card's "What
 *  We Can Help With") and `includedServices` (Service Detail page's
 *  "Services Include") — the backend models one admin-managed feature list
 *  per service (see backend/bookings/models.py's ServiceFeature), not two
 *  separate ones. */
function mapApiService(data: ServiceListApiShape | ServiceDetailApiShape): Service {
  const features = 'features' in data ? data.features.map((feature) => feature.title) : []
  const fullDescription = 'full_description' in data ? data.full_description : ''

  return {
    id: data.slug,
    name: data.name,
    ariaLabel: data.name,
    imageUrl: data.image ? `${API_BASE_URL}${data.image}` : undefined,
    shortDescription: data.short_description,
    detailIntro: fullDescription || data.short_description,
    helpWith: features,
    includedServices: features,
    startingPrice: data.estimated_price_from,
    estimatedPriceTo: data.estimated_price_to,
    ctaLabel: `Book ${data.name}`,
  }
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: 'GET' })
  } catch {
    throw new ServicesApiError('Network error. Check your connection and try again.')
  }

  let data: (ApiErrorBody & Record<string, unknown>) | null = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by response.ok below.
  }

  if (!response.ok) {
    throw new ServicesApiError(data?.detail ?? 'Something went wrong. Please try again.', response.status)
  }

  return data as T
}

/** GET /api/services/ — active services only, in admin-controlled display
 *  order. Used by ServicesPage to render one card per service. */
export async function getServices(): Promise<Service[]> {
  if (DEMO_MODE) {
    await demoDelay()
    // The project's original 4 hardcoded services (data/services.ts) —
    // already in exactly this shape, so no mapping needed. See that file's
    // own header comment: this is precisely what it was kept around for.
    return demoServices
  }
  const data = await getJson<ServiceListApiShape[]>('/api/services/')
  return data.map(mapApiService)
}

/** GET /api/services/:slug/ — throws ServicesApiError with status 404 for
 *  an unknown or inactive slug (see backend/bookings/views.py's
 *  service_detail). Used by both ServiceDetailPage and BookingPage — the
 *  same "which service is this" lookup either page needs. */
export async function getServiceDetail(slug: string): Promise<Service> {
  if (DEMO_MODE) {
    await demoDelay()
    const found = demoServices.find((service) => service.id === slug)
    if (!found) throw new ServicesApiError('Service not found.', 404)
    return found
  }
  const data = await getJson<ServiceDetailApiShape>(`/api/services/${slug}/`)
  return mapApiService(data)
}
