import { useEffect, useRef, useState } from 'react'
import { MapPinIcon } from '../icons/Icons'
import { isGoogleMapsConfigured, loadGoogleMaps } from '../../lib/googleMaps'
import type { BookingLocation } from '../../data/booking'

interface LocationPickerProps {
  location: BookingLocation
  onLocationChange: (location: BookingLocation) => void
}

type MapStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

// Kochi city-center — matches businessInfo.serviceArea (see MapEmbed.tsx),
// used only as the map's initial viewport. No pin is placed here; the
// customer's actual location is never assumed.
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 9.9312, lng: 76.2673 }
const DEFAULT_ZOOM = 12
const SELECTED_ZOOM = 16

/**
 * Google Maps location picker — click/tap the map or drag the marker to
 * choose a point, or use the button to request the browser's geolocation
 * (only on click, never on mount). Both paths funnel through
 * `onLocationChange`, so latitude/longitude/address always live in the
 * parent's BookingFormValues.location, never local-only state.
 *
 * Degrades deliberately at every layer instead of ever blanking the page:
 * - No VITE_GOOGLE_MAPS_API_KEY configured -> skips loading entirely, shows
 *   the "map unavailable" panel immediately (see googleMaps.ts).
 * - Script present but fails to load/init -> same panel, reached via catch.
 * - Either way, "Use My Current Location" still works (plain browser
 *   Geolocation API, independent of Google Maps) and still stores lat/lng —
 *   the customer just won't see a visual pin confirm it. The required
 *   address fields above this component cover dispatch either way.
 */
export function LocationPicker({ location, onLocationChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  // Always current for the map-click listener below without re-registering
  // it on every location change — same ref-mirrors-latest-prop approach as
  // Toast.tsx/Modal.tsx elsewhere in this project.
  const onLocationChangeRef = useRef(onLocationChange)
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange
  })

  const [mapStatus, setMapStatus] = useState<MapStatus>('idle')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setMapStatus('unavailable')
      return
    }

    let cancelled = false
    setMapStatus('loading')

    loadGoogleMaps()
      .then(({ maps }) => {
        if (cancelled || !mapContainerRef.current) return

        const map = new maps.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        })
        mapRef.current = map
        geocoderRef.current = new maps.Geocoder()

        map.addListener('click', (event) => {
          if (!event.latLng) return
          placeMarker(event.latLng.lat(), event.latLng.lng())
        })

        setMapStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setMapStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
    // Runs once — the map instance is imperative/persistent, same reasoning
    // as HeroCarousel's Owl Carousel effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function placeMarker(lat: number, lng: number) {
    const map = mapRef.current
    if (map && window.google?.maps) {
      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng })
      } else {
        const marker = new window.google.maps.Marker({ position: { lat, lng }, map, draggable: true })
        marker.addListener('dragend', () => {
          const position = marker.getPosition()
          if (position) handleSelected(position.lat(), position.lng())
        })
        markerRef.current = marker
      }
      map.panTo({ lat, lng })
    }
    handleSelected(lat, lng)
  }

  function handleSelected(lat: number, lng: number) {
    onLocationChangeRef.current({ latitude: lat, longitude: lng, address: null })
    reverseGeocode(lat, lng)
  }

  function reverseGeocode(lat: number, lng: number) {
    const geocoder = geocoderRef.current
    if (!geocoder) return
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        onLocationChangeRef.current({ latitude: lat, longitude: lng, address: results[0].formatted_address })
      }
    })
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location detection. Please select your location manually on the map.")
      return
    }

    setLocationError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        const { latitude, longitude } = position.coords
        if (mapStatus === 'ready') {
          placeMarker(latitude, longitude)
          mapRef.current?.panTo({ lat: latitude, lng: longitude })
          mapRef.current?.setZoom(SELECTED_ZOOM)
        } else {
          handleSelected(latitude, longitude)
        }
      },
      (error) => {
        setLocating(false)
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "We couldn't access your current location. You can select your service location manually on the map."
            : "We couldn't determine your current location. Please select it manually on the map.",
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const hasSelection = location.latitude != null && location.longitude != null

  return (
    <div className="booking-section">
      <h2 className="booking-section__heading">Service Location</h2>
      <p className="booking-section__hint">
        Pinpoint your service location on the map, or use your current location — this helps our technician find you
        faster.
      </p>

      <div className="location-picker">
        <div
          ref={mapContainerRef}
          className="location-picker__map"
          role="group"
          aria-label="Interactive map for selecting your service location"
        />

        {mapStatus === 'loading' && (
          <div className="location-picker__overlay" role="status">
            Loading map…
          </div>
        )}

        {mapStatus === 'unavailable' && (
          <div className="location-picker__overlay location-picker__overlay--muted" role="status">
            <p>Unable to load the map.</p>
            <p>Please use "Use My Current Location" below, or enter your address manually above.</p>
          </div>
        )}

        {mapStatus === 'ready' && !hasSelection && (
          <span className="location-picker__hint-badge" aria-hidden="true">
            Tap the map to drop a pin
          </span>
        )}
      </div>

      <button
        type="button"
        className="btn btn--ghost location-picker__current"
        onClick={handleUseCurrentLocation}
        disabled={locating}
      >
        <MapPinIcon />
        {locating ? 'Locating…' : 'Use My Current Location'}
      </button>

      {locationError && (
        <p className="form-field__error" role="alert">
          {locationError}
        </p>
      )}

      {hasSelection && (
        <p className="location-picker__selected">
          <MapPinIcon aria-hidden="true" />
          {location.address ?? `Selected: ${location.latitude!.toFixed(5)}, ${location.longitude!.toFixed(5)}`}
        </p>
      )}
    </div>
  )
}
