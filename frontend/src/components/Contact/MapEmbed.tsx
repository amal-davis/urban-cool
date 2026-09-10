import { businessInfo } from '../../data/businessInfo'
import './MapEmbed.css'

/**
 * Plain `maps.google.com` embed URL — no Google Maps API key required (only
 * the JS Maps/Places SDKs need one; this iframe form doesn't). If a pinned,
 * API-driven map is wanted later, the key would need to live in an
 * environment variable (e.g. `VITE_GOOGLE_MAPS_API_KEY`, read via
 * `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`) — never hardcoded here.
 *
 * Centered on `businessInfo.mapQuery`, currently just "Kochi, Kerala" (no
 * exact business address exists yet — see businessInfo.ts) — a city-level
 * view, not a precise pin standing in for a real location.
 */
export function MapEmbed() {
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(businessInfo.mapQuery)}&z=12&output=embed`

  return (
    <div className="map-embed">
      <iframe
        className="map-embed__frame"
        title={`Map showing Urban Cool's service area in ${businessInfo.mapQuery}`}
        src={mapSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="map-embed__caption">
        Showing {businessInfo.mapQuery} — exact location to be added once available.
      </p>
    </div>
  )
}
