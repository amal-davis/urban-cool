import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Service } from '../data/services'
import { getServiceDetail, ServicesApiError } from '../lib/servicesApi'
import { createInitialBookingFormValues } from '../data/booking'
import type { BookingFormValues } from '../data/booking'
import { ChevronLeftIcon } from '../components/icons/Icons'
import { ServiceNotFound } from '../components/ServiceDetailPage/ServiceNotFound'
import { BookingForm } from '../components/Booking/BookingForm'
import { BookingSummary } from '../components/Booking/BookingSummary'
import { BookingReview } from '../components/Booking/BookingReview'
import { BookingSuccess } from '../components/Booking/BookingSuccess'
import { Toast } from '../components/Toast/Toast'
import { usePageMeta } from '../lib/usePageMeta'
import { useAuth } from '../lib/AuthContext'
import { getAddress } from '../lib/customerApi'
import type { CustomerAddress } from '../lib/customerApi'
import { BookingApiError, createBooking } from '../lib/bookingApi'
import { BookingPageSkeleton } from './skeletons/BookingPageSkeleton'
import '../components/ServiceDetailPage/ServiceDetailPage.css'
import '../components/Booking/BookingPage.css'

type Step = 'form' | 'review' | 'success'
type ServiceLoadState = 'loading' | 'not-found' | 'error' | 'ready'

/**
 * Reusable booking page — one route (/booking/:serviceId, a ProtectedRoute
 * per App.tsx — booking creates real, owned data), one component, driven by
 * whichever service GET /api/services/:slug/ resolves for the URL's
 * :serviceId (see lib/servicesApi.ts), same approach as ServiceDetailPage —
 * so a service added purely from Django Admin is immediately bookable too,
 * with no frontend change. Owns the entire booking flow's state (current
 * step + the form values every child reads and writes through controlled
 * props, plus submission/result state for the real API call).
 */
export function BookingPage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const { customer } = useAuth()

  // Hooks must run unconditionally, so every one of these is declared
  // before the loading/invalid-service/no-customer early returns below,
  // even though most are only used once all three are resolved.
  const [serviceState, setServiceState] = useState<ServiceLoadState>('loading')
  const [service, setService] = useState<Service | null>(null)
  const [serviceReloadToken, setServiceReloadToken] = useState(0)
  const [step, setStep] = useState<Step>('form')
  const [values, setValues] = useState<BookingFormValues | null>(null)
  const [imageErrorToast, setImageErrorToast] = useState<string | null>(null)
  const [savedAddress, setSavedAddress] = useState<CustomerAddress | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdBookingRef, setCreatedBookingRef] = useState<string | null>(null)

  useEffect(() => {
    if (!serviceId) {
      setServiceState('not-found')
      return
    }

    let cancelled = false
    setServiceState('loading')

    getServiceDetail(serviceId)
      .then((data) => {
        if (cancelled) return
        setService(data)
        setServiceState('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setServiceState(error instanceof ServicesApiError && error.status === 404 ? 'not-found' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [serviceId, serviceReloadToken])

  usePageMeta(
    service ? `Book ${service.name} | Urban Cool` : 'Service Not Found | Urban Cool',
    service
      ? `Book ${service.name.toLowerCase()} with Urban Cool. Estimated cost ₹${service.startingPrice} - ₹${service.estimatedPriceTo}.`
      : "The service you're looking for could not be found on Urban Cool.",
  )

  // Fetched once on mount — while `values` is still null (the customer
  // hasn't touched any field yet), the lazy `currentValues` below recomputes
  // from this on every render, so the address prefill still "arrives" once
  // this resolves without any extra synchronization. If the customer starts
  // typing before this resolves, `values` is already set and this is simply
  // ignored — a minor, acceptable trade-off (see data/booking.ts's own
  // comment) rather than blocking the whole form on this fetch.
  useEffect(() => {
    let cancelled = false
    getAddress()
      .then((address) => {
        if (!cancelled) setSavedAddress(address)
      })
      .catch(() => {
        // No saved address is a perfectly normal state, not a failure to
        // surface — the form just starts with blank address fields.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // App.tsx's ScrollToTop only fires on route (pathname) changes — this is
  // an in-page step change, so without this a customer who scrolled deep
  // into the form before clicking Continue would land on Review already
  // scrolled past its heading.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [step])

  // Object URLs for uploaded image previews (see data/booking.ts's
  // BookingImageFile) live for as long as this page does — ImageUploader
  // itself unmounts on every step change (form -> review -> success) while
  // `values` stays alive, so it can't own this cleanup without breaking
  // previews the moment the customer leaves the form step. This revokes
  // whatever's still outstanding only when the booking page itself
  // unmounts (navigating away entirely); individual removals still revoke
  // their own URL immediately in ImageUploader.
  const imagesRef = useRef(values?.images ?? [])
  useEffect(() => {
    imagesRef.current = values?.images ?? []
  })
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [])

  if (serviceState === 'loading') {
    return <BookingPageSkeleton />
  }

  if (serviceState === 'error') {
    return (
      <section className="service-detail service-detail--not-found">
        <div className="container">
          <ServiceNotFound
            heading="Something Went Wrong"
            description="We couldn't load this service right now. Please check your connection and try again."
            onRetry={() => setServiceReloadToken((n) => n + 1)}
          />
        </div>
      </section>
    )
  }

  if (serviceState === 'not-found' || !service) {
    return (
      <section className="service-detail service-detail--not-found">
        <div className="container">
          <ServiceNotFound />
        </div>
      </section>
    )
  }

  // Guaranteed non-null in practice — this route is a ProtectedRoute (see
  // App.tsx), which only renders its children once AuthContext's customer
  // is set. Same guard UserDashboard.tsx uses for the same reason.
  if (!customer) return null

  // Lazily seeded on first render once `service`/`customer` are known,
  // rather than a second `useState(() => ...)` above the early returns —
  // this keeps the prefill tied to whichever service actually resolved, and
  // (see the mount effect above) recomputes with the saved address once
  // that fetch resolves, as long as the customer hasn't started typing yet.
  const currentValues = values ?? createInitialBookingFormValues(service, customer, savedAddress)

  function handleBackToService() {
    navigate(`/service/${service!.id}`)
  }

  async function handleConfirm() {
    if (submitting) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const booking = await createBooking(
        {
          service: currentValues.serviceId,
          bookingDate: currentValues.bookingDate,
          bookingTime: currentValues.bookingTime,
          addressLine: `${currentValues.address.houseNumber}, ${currentValues.address.street}`.replace(/^,\s*|,\s*$/g, ''),
          city: currentValues.address.city,
          state: currentValues.address.state,
          pincode: currentValues.address.pincode,
          latitude: currentValues.location.latitude,
          longitude: currentValues.location.longitude,
          complaint: currentValues.complaint,
        },
        currentValues.images.map((image) => image.file),
      )
      setCreatedBookingRef(booking.bookingRef)
      setStep('success')
    } catch (error) {
      setSubmitError(
        error instanceof BookingApiError ? error.message : 'Could not submit your booking. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="booking-page">
      <div className="container">
        <button type="button" className="service-detail__back booking-page__back" onClick={handleBackToService}>
          <ChevronLeftIcon />
          <span>Back to Service</span>
        </button>

        {step === 'form' && (
          <>
            <div className="booking-page__intro">
              <h1 className="booking-page__heading">Book Your Service</h1>
              <p className="booking-page__subtext">
                Tell us a little about your service requirement and we'll help you get it sorted.
              </p>
            </div>

            <div className="booking-page__grid">
              <BookingForm
                values={currentValues}
                onChange={setValues}
                onImageError={setImageErrorToast}
                onContinue={() => setStep('review')}
              />
              <BookingSummary service={service} />
            </div>
          </>
        )}

        {step === 'review' && (
          <BookingReview
            service={service}
            values={currentValues}
            onEdit={() => setStep('form')}
            onConfirm={handleConfirm}
            submitting={submitting}
            error={submitError}
          />
        )}

        {step === 'success' && createdBookingRef && <BookingSuccess service={service} bookingRef={createdBookingRef} />}
      </div>

      <Toast message={imageErrorToast} onDismiss={() => setImageErrorToast(null)} />
    </article>
  )
}
