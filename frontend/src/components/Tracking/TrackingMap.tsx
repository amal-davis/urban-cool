import { useEffect, useRef, useState } from 'react'
import { isGoogleMapsConfigured, loadGoogleMaps } from '../../lib/googleMaps'
import '../Booking/BookingPage.css'

export interface TrackingMapPoint {
  lat: number
  lng: number
}

interface TrackingMapProps {
  /** The service address's own coordinates — null when the customer never
   *  pinned a location at booking time (Google Maps was never mandatory —
   *  see LocationPicker.tsx). */
  customerLocation: TrackingMapPoint | null
  /** null = nothing to plot for the technician yet (no technician assigned,
   *  no location update recorded, or the job is no longer live) — only the
   *  customer marker renders. */
  technicianLocation: TrackingMapPoint | null
  /** ISO timestamp of the technician location above, for the text fallback
   *  below when a real map can't render. */
  technicianLocationUpdatedAt: string | null
  /** Whether to draw the technician -> customer line. Decided by the
   *  caller (technician_on_the_way only — see ServiceTrackingPage), not by
   *  this component, so TrackingMap stays a pure "draw what I'm given"
   *  presentational piece with no booking-status logic of its own. */
  showRoute: boolean
}

type MapStatus = 'loading' | 'ready' | 'unavailable' | 'no-location'

const CUSTOMER_MARKER_COLOR = '#0186dc' // --color-primary
const TECHNICIAN_MARKER_COLOR = '#bf052e' // --color-accent
const ROUTE_COLOR = '#0059ae' // --color-primary-deep

function formatCoordinate(value: number): string {
  return value.toFixed(5)
}

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/**
 * Read-only tracking map — customer marker when a service-address location
 * was pinned, technician marker when `technicianLocation` is provided, a
 * straight demonstration line between them when `showRoute` is true. This
 * is NOT a real Directions/Roads API route (none is configured — see the
 * comment on ROUTE_COLOR's Polyline below); it's an honest straight-line
 * indicator of direction only, never presented as an actual driving route.
 *
 * No Google Maps API key is hardcoded or faked anywhere here — exactly
 * LocationPicker.tsx's own "no key configured -> honest fallback, never a
 * blank map or a crashed page" pattern, reused via the same
 * isGoogleMapsConfigured()/loadGoogleMaps() helpers and the same CSS (see
 * BookingPage.css's .location-picker). Two things are new for the tracking
 * context specifically, since a real booking may have no map at all to
 * show: (1) `customerLocation` is nullable — a 'no-location' status when
 * there's genuinely nothing to plot yet (map key configured or not, it
 * doesn't matter — there's no fake marker to invent), distinct from
 * 'unavailable' (map key missing/script failed); (2) the 'unavailable'
 * fallback now shows the real coordinates as plain text plus a
 * "last updated" stamp when a technician location exists, instead of only
 * a generic "can't load" message — a customer can still act on a lat/lng
 * pair even without the visual map.
 *
 * Deliberately reactive to props: the marker-placement effect re-runs
 * whenever `customerLocation`/`technicianLocation`/`showRoute` change,
 * which is exactly the seam useBookingTracking.ts's polling already
 * exercises — the technician's location arriving or updating over time
 * needs no change to this component.
 */
export function TrackingMap({ customerLocation, technicianLocation, technicianLocationUpdatedAt, showRoute }: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const customerMarkerRef = useRef<google.maps.Marker | null>(null)
  const technicianMarkerRef = useRef<google.maps.Marker | null>(null)
  const routeRef = useRef<google.maps.Polyline | null>(null)

  const hasLocation = customerLocation !== null || technicianLocation !== null
  const [mapStatus, setMapStatus] = useState<MapStatus>(hasLocation ? 'loading' : 'no-location')

  // Creates the Map instance the first time there's actually something to
  // plot, and only once — guarded by mapRef.current so a later location
  // update (e.g. the technician's very first location arriving mid-poll)
  // can't re-trigger map creation. Keyed on `hasLocation` (not the raw
  // coordinates) specifically so it re-evaluates exactly once when that
  // flips from false to true, not on every subsequent coordinate change.
  useEffect(() => {
    if (mapRef.current) return
    if (!hasLocation) {
      setMapStatus('no-location')
      return
    }
    if (!isGoogleMapsConfigured()) {
      setMapStatus('unavailable')
      return
    }

    let cancelled = false
    setMapStatus('loading')
    const center = customerLocation ?? technicianLocation
    if (!center) return

    loadGoogleMaps()
      .then(({ maps }) => {
        if (cancelled || !mapContainerRef.current) return
        mapRef.current = new maps.Map(mapContainerRef.current, {
          center,
          zoom: 13,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        })
        setMapStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setMapStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocation])

  // Places/updates/removes markers and the route line whenever the map is
  // ready or the location props change.
  useEffect(() => {
    const map = mapRef.current
    if (mapStatus !== 'ready' || !map || !window.google?.maps) return
    const { maps } = window.google

    if (customerLocation) {
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setPosition(customerLocation)
      } else {
        customerMarkerRef.current = new maps.Marker({
          position: customerLocation,
          map,
          title: 'Service location',
          label: { text: 'C', color: '#fff', fontWeight: '700' },
          icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: CUSTOMER_MARKER_COLOR, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          zIndex: 1,
        })
      }
    } else if (customerMarkerRef.current) {
      customerMarkerRef.current.setMap(null)
      customerMarkerRef.current = null
    }

    if (technicianLocation) {
      if (technicianMarkerRef.current) {
        technicianMarkerRef.current.setPosition(technicianLocation)
      } else {
        technicianMarkerRef.current = new maps.Marker({
          position: technicianLocation,
          map,
          title: 'Technician location',
          label: { text: 'T', color: '#fff', fontWeight: '700' },
          icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: TECHNICIAN_MARKER_COLOR, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          zIndex: 2,
        })
      }
    } else if (technicianMarkerRef.current) {
      technicianMarkerRef.current.setMap(null)
      technicianMarkerRef.current = null
    }

    if (showRoute && technicianLocation && customerLocation) {
      const path = [technicianLocation, customerLocation]
      if (routeRef.current) {
        routeRef.current.setMap(null)
      }
      // A straight demonstration line, not a real route — see this
      // component's top comment.
      routeRef.current = new maps.Polyline({
        path,
        map,
        strokeColor: ROUTE_COLOR,
        strokeOpacity: 0,
        strokeWeight: 3,
        geodesic: true,
        icons: [{ icon: { path: maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: ROUTE_COLOR }, offset: '0', repeat: '18px' }],
      })
    } else if (routeRef.current) {
      routeRef.current.setMap(null)
      routeRef.current = null
    }

    const bounds = new maps.LatLngBounds()
    let hasBounds = false
    if (customerLocation) {
      bounds.extend(customerLocation)
      hasBounds = true
    }
    if (technicianLocation) {
      bounds.extend(technicianLocation)
      hasBounds = true
    }
    if (hasBounds) map.fitBounds(bounds, 56)
  }, [mapStatus, customerLocation, technicianLocation, showRoute])

  const label = technicianLocation
    ? 'Map showing your technician and service location'
    : 'Map showing your service location'

  // Prefer the technician's live position for the text fallback — it's the
  // thing actually changing over the job; the service address alone is
  // already shown elsewhere on the page (BookingDetailsCard).
  const fallback = technicianLocation
    ? { heading: 'Technician Location', point: technicianLocation, updatedAt: technicianLocationUpdatedAt }
    : customerLocation
      ? { heading: 'Service Location', point: customerLocation, updatedAt: null }
      : null

  return (
    <div className="location-picker">
      <div ref={mapContainerRef} className="location-picker__map" role="group" aria-label={label} />

      {mapStatus === 'loading' && (
        <div className="location-picker__overlay" role="status">
          Loading map…
        </div>
      )}

      {mapStatus === 'no-location' && (
        <div className="location-picker__overlay location-picker__overlay--muted" role="status">
          <p>Live map will be available soon.</p>
        </div>
      )}

      {mapStatus === 'unavailable' && (
        <div className="location-picker__overlay location-picker__overlay--muted" role="status">
          {fallback ? (
            <>
              <p className="tracking-map__fallback-heading">{fallback.heading}</p>
              <p>
                Latitude {formatCoordinate(fallback.point.lat)}, Longitude {formatCoordinate(fallback.point.lng)}
              </p>
              {fallback.updatedAt && <p>Last updated {formatUpdatedAt(fallback.updatedAt)}</p>}
            </>
          ) : (
            <p>Live map will be available soon.</p>
          )}
          <p>You can still reach your technician using the call option below.</p>
        </div>
      )}
    </div>
  )
}
