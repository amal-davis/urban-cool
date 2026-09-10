import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon, ChatIcon } from '../components/icons/Icons'
import { BookingNotFound } from '../components/Tracking/BookingNotFound'
import { BookingSummaryCard } from '../components/Tracking/BookingSummaryCard'
import { BookingDetailsCard } from '../components/Tracking/BookingDetailsCard'
import { StatusTimeline } from '../components/Tracking/StatusTimeline'
import { CurrentStatusMessage } from '../components/Tracking/CurrentStatusMessage'
import { TechnicianSection } from '../components/Tracking/TechnicianSection'
import { TrackingMap } from '../components/Tracking/TrackingMap'
import { CompletedSummary } from '../components/Tracking/CompletedSummary'
import { useBookingTracking } from '../lib/useBookingTracking'
import { usePageMeta } from '../lib/usePageMeta'
import '../components/ServiceDetailPage/ServiceDetailPage.css'
import '../components/Tracking/TrackingPage.css'

const LOCATION_SECTION_COPY: Partial<Record<string, { heading: string; subtext?: string }>> = {
  pending: { heading: 'Service Location' },
  confirmed: { heading: 'Service Location' },
  assigned: { heading: 'Technician Location' },
  technician_on_the_way: { heading: 'Live Location', subtext: 'Your technician is on the way' },
  arrived: { heading: 'Technician Location', subtext: 'Your technician has arrived at your location' },
  in_progress: { heading: 'Technician Location', subtext: 'Your service is currently in progress' },
}

/**
 * Reusable Service Tracking page — one route (/track/:bookingId), driven by
 * the real booking whichever id matches (see lib/useBookingTracking.ts's
 * polling hook, wired to backend/bookings/views.py's booking_tracking).
 * ProtectedRoute (App.tsx) already guarantees a signed-in customer by the
 * time this renders; the hook's own 401/403 handling covers a session that
 * expires mid-visit.
 *
 * Distinct render paths, in order: loading (first fetch only — a stale
 * poll failure after that never blanks the page, see the hook's own
 * refreshError), not-found/unauthorized (BookingNotFound — covers both a
 * bad id and another customer's booking id identically, since the backend
 * 404s either way rather than ever confirming which), cancelled (a plain
 * panel — never the active timeline/technician content, since "on the way"
 * etc. would be actively misleading for a cancelled job), and the normal
 * in-progress/completed view.
 */
export function ServiceTrackingPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const numericId = Number(bookingId)

  usePageMeta(
    'Track Your Service | Urban Cool',
    'Track your Urban Cool service booking, technician, and live location.',
  )

  const { tracking, loading, error, refreshError } = useBookingTracking(numericId)

  if (loading) {
    return (
      <section className="service-detail service-detail--not-found">
        <div className="container">
          <p role="status" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-muted)' }}>
            Loading booking…
          </p>
        </div>
      </section>
    )
  }

  if (error || !tracking) {
    return (
      <section className="service-detail service-detail--not-found">
        <div className="container">
          <BookingNotFound />
        </div>
      </section>
    )
  }

  if (tracking.status === 'cancelled') {
    return (
      <article className="tracking-page">
        <div className="container">
          <header className="tracking-page__header">
            <button
              type="button"
              className="service-detail__back tracking-page__back"
              onClick={() => navigate('/dashboard')}
              aria-label="Back to My Bookings"
            >
              <ChevronLeftIcon />
            </button>
            <h1 className="tracking-page__heading">Track Your Service</h1>
          </header>

          <BookingSummaryCard tracking={tracking} />

          <div className="tracking-section">
            <h2 className="tracking-section__heading">Booking Cancelled</h2>
            <p className="status-timeline__message">This booking has been cancelled.</p>
          </div>

          <BookingDetailsCard tracking={tracking} />
        </div>
      </article>
    )
  }

  const status = tracking.status
  const showMap = status !== 'completed'
  const showChat = tracking.technicianName !== null && status !== 'completed'
  const locationCopy = LOCATION_SECTION_COPY[status]

  return (
    <article className="tracking-page">
      <div className="container">
        <header className="tracking-page__header">
          <button
            type="button"
            className="service-detail__back tracking-page__back"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to My Bookings"
          >
            <ChevronLeftIcon />
          </button>
          <h1 className="tracking-page__heading">Track Your Service</h1>
        </header>

        {refreshError && (
          <p className="tracking-section__hint" role="status" style={{ marginBottom: 'var(--space-md)' }}>
            Unable to refresh right now. Still showing the latest available update.
          </p>
        )}

        <div className="tracking-page__top">
          <BookingSummaryCard tracking={tracking} />

          <div className="tracking-section tracking-page__status-card">
            <h2 className="tracking-section__heading">Service Status</h2>
            <StatusTimeline status={status} />
            <CurrentStatusMessage status={status} />
          </div>
        </div>

        <div className="tracking-page__grid">
          <div className="tracking-page__left">
            <TechnicianSection technicianName={tracking.technicianName} technicianPhone={tracking.technicianPhone} />

            {status === 'completed' && <CompletedSummary serviceName={tracking.serviceName} />}
          </div>

          <div className="tracking-page__right">
            {showMap && (
              <div className="tracking-section">
                {locationCopy && (
                  <>
                    <h2 className="tracking-section__heading">{locationCopy.heading}</h2>
                    {locationCopy.subtext && <p className="tracking-section__hint">{locationCopy.subtext}</p>}
                  </>
                )}
                <TrackingMap
                  customerLocation={tracking.latitude !== null && tracking.longitude !== null ? { lat: tracking.latitude, lng: tracking.longitude } : null}
                  technicianLocation={
                    tracking.technicianLatitude !== null && tracking.technicianLongitude !== null
                      ? { lat: tracking.technicianLatitude, lng: tracking.technicianLongitude }
                      : null
                  }
                  technicianLocationUpdatedAt={tracking.locationUpdatedAt}
                  showRoute={status === 'technician_on_the_way'}
                />
              </div>
            )}
          </div>
        </div>

        {showChat && (
          <div className="tracking-page__chat-cta">
            <button type="button" className="btn btn--accent" disabled title="Coming soon">
              <ChatIcon aria-hidden="true" /> Chat with Technician
            </button>
          </div>
        )}

        <BookingDetailsCard tracking={tracking} />
      </div>
    </article>
  )
}
