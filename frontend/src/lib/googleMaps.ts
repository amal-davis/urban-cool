/**
 * Minimal loader for the Google Maps JavaScript API. This project has no
 * existing Google Maps integration (checked — ContactPage's MapEmbed.tsx is
 * a plain `maps.google.com` iframe, which needs no API key at all) and no
 * @types/google.maps dependency, so this loads the script by hand rather
 * than pulling in a wrapper library for one component's worth of usage. See
 * types/google-maps.d.ts for the (intentionally minimal) type surface.
 *
 * The key is read from `VITE_GOOGLE_MAPS_API_KEY` — never hardcoded (see
 * frontend/.env.example) — and if it's unset, `loadGoogleMaps()` rejects
 * immediately without ever making a network request, so LocationPicker can
 * fall back to its manual-entry state without so much as attempting a call
 * that could never succeed. Set an HTTP referrer restriction on the key in
 * Google Cloud Console before shipping any real key here — a browser-side
 * Maps JS key is public by nature, and the referrer restriction is what
 * keeps it from being usable off this site.
 */

type GoogleMapsApi = { maps: typeof google.maps }

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
const LOADER_ATTR = 'data-google-maps-loader'

let loadPromise: Promise<GoogleMapsApi> | null = null

export function isGoogleMapsConfigured(): boolean {
  return Boolean(API_KEY)
}

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (!API_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'))
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${LOADER_ATTR}]`)
    if (existing) {
      existing.addEventListener('load', () => (window.google?.maps ? resolve(window.google) : reject(new Error('Google Maps failed to initialize.'))))
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps.')))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&loading=async`
    script.async = true
    script.defer = true
    script.setAttribute(LOADER_ATTR, 'true')
    script.addEventListener('load', () => {
      if (window.google?.maps) resolve(window.google)
      else reject(new Error('Google Maps failed to initialize.'))
    })
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps.')))
    document.head.appendChild(script)
  })

  return loadPromise
}
