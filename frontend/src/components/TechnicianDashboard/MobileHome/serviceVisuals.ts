import type { ComponentType, SVGProps } from 'react'
import { BriefcaseIcon } from '../../icons/Icons'
import { services } from '../../../data/services'

/**
 * Maps a job's `serviceName` (free text from the backend's Service row —
 * see lib/technicianJobsApi.ts) onto the appliance illustration and colour
 * tone the mobile home uses for it.
 *
 * The illustration comes from data/services.ts's own `Icon` field rather
 * than new artwork: that field exists precisely for the small-badge
 * contexts a photo can't serve (see its doc comment there), which is
 * exactly what a job card's thumbnail is.
 *
 * Tones are fixed per service, not cycled by list position — the same
 * service has to read the same colour whether it turns up in Today's Jobs,
 * Tomorrow's Jobs, or the week schedule, otherwise the colour stops meaning
 * "AC work" and starts meaning "third row".
 */

const SERVICE_TONES: Record<string, number> = {
  ac: 0,
  'washing-machine': 1,
  microwave: 2,
  refrigerator: 3,
}

export interface ServiceVisual {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** 0–3, matching the `--tone-N` classes in MobileTechnicianHome.css. */
  tone: number
}

const FALLBACK: ServiceVisual = { Icon: BriefcaseIcon, tone: 0 }

export function serviceVisual(serviceName: string): ServiceVisual {
  const needle = serviceName.trim().toLowerCase()

  // Exact label match first (the four seeded services line up with
  // `name`/`ariaLabel` exactly), then a looser containment check so a
  // backend-renamed service ("AC Deep Clean", "Split AC Service", ...)
  // still lands on the right appliance instead of the generic fallback.
  const match =
    services.find((service) => service.name.toLowerCase() === needle || service.ariaLabel.toLowerCase() === needle) ??
    services.find((service) => needle.includes(service.id.replace('-', ' ')) || needle.includes(service.name.toLowerCase()))

  if (!match?.Icon) return FALLBACK

  return { Icon: match.Icon, tone: SERVICE_TONES[match.id] ?? 0 }
}
