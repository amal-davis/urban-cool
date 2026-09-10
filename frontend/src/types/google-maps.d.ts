// Google Maps JavaScript API ships no bundled types and this project has no
// @types/google.maps dependency (checked package.json before adding this —
// same reasoning as owl-carousel.d.ts). Loaded at runtime by lib/googleMaps.ts
// as a plain <script> tag, not an npm package, so these declarations cover
// only the surface LocationPicker.tsx and TrackingMap.tsx actually call.
export {}

declare global {
  namespace google.maps {
    interface LatLngLiteral {
      lat: number
      lng: number
    }

    class LatLng {
      lat(): number
      lng(): number
    }

    interface MapsEventListener {
      remove(): void
    }

    interface MapMouseEvent {
      latLng: LatLng | null
    }

    interface MapOptions {
      center: LatLngLiteral
      zoom: number
      disableDefaultUI?: boolean
      zoomControl?: boolean
      streetViewControl?: boolean
      fullscreenControl?: boolean
      mapTypeControl?: boolean
      clickableIcons?: boolean
    }

    class LatLngBounds {
      extend(point: LatLngLiteral): LatLngBounds
    }

    class Map {
      constructor(element: HTMLElement, options: MapOptions)
      panTo(latLng: LatLngLiteral): void
      setZoom(zoom: number): void
      fitBounds(bounds: LatLngBounds, padding?: number): void
      addListener(eventName: 'click', handler: (event: MapMouseEvent) => void): MapsEventListener
    }

    /** Vector marker icon — used instead of an emoji/image pin so customer
     *  vs. technician markers are distinct through real map iconography
     *  (see TrackingMap.tsx). */
    interface Symbol {
      path: number
      scale?: number
      fillColor?: string
      fillOpacity?: number
      strokeColor?: string
      strokeWeight?: number
    }

    const SymbolPath: { CIRCLE: number; FORWARD_CLOSED_ARROW: number }

    interface MarkerLabel {
      text: string
      color?: string
      fontWeight?: string
      fontSize?: string
    }

    interface MarkerOptions {
      position: LatLngLiteral
      map: Map
      draggable?: boolean
      title?: string
      icon?: Symbol
      label?: MarkerLabel
      zIndex?: number
    }

    class Marker {
      constructor(options: MarkerOptions)
      setPosition(latLng: LatLngLiteral): void
      getPosition(): LatLng | null
      setMap(map: Map | null): void
      addListener(eventName: 'dragend', handler: () => void): MapsEventListener
    }

    interface PolylineOptions {
      path: LatLngLiteral[]
      map?: Map
      strokeColor?: string
      strokeOpacity?: number
      strokeWeight?: number
      geodesic?: boolean
      icons?: { icon: Symbol; offset?: string; repeat?: string }[]
    }

    /** Frontend-only demonstration route (a straight line between two
     *  points), not a real Directions/Roads API result — see TrackingMap.tsx
     *  and DESIGN item #17 on why this is deliberate. */
    class Polyline {
      constructor(options: PolylineOptions)
      setMap(map: Map | null): void
    }

    interface GeocoderRequest {
      location: LatLngLiteral
    }

    interface GeocoderResult {
      formatted_address: string
    }

    type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'ERROR' | string

    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void,
      ): void
    }
  }

  interface Window {
    google?: { maps: typeof google.maps }
  }
}
