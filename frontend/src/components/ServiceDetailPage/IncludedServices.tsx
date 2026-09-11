import { SettingsIcon, ShieldCheckIcon, CheckCircleIcon, ClockIcon, TechnicianIcon } from '../icons/Icons'

interface IncludedServicesProps {
  items: string[]
}

/** Cycled, not mapped 1:1 to specific wording — `includedServices` is a
 *  free-text list per service (data/services.ts) with no icon field of its
 *  own, so a small fixed set of general "what a visit covers" glyphs
 *  (inspection, protection, a completed check, timing, hands-on repair)
 *  rotates across however many items a given service has, rather than
 *  guessing an icon from each item's text. */
const CHIP_ICONS = [SettingsIcon, ShieldCheckIcon, CheckCircleIcon, ClockIcon, TechnicianIcon]

/** Four tint classes (see .service-detail__included-icon--0..3 in
 *  ServiceDetailPage.css), cycled independently of CHIP_ICONS above so two
 *  neighboring chips never repeat the exact same icon+color pairing.
 *  Deliberately a shorter cycle than the icons — matches the ~4 colors the
 *  reference design shows in one row. */
const CHIP_TONES = 4

/**
 * "Services Include" as a row of icon + label chips, directly under the
 * hero image — the "icon section" from the supplied reference design.
 * Sits in a Panel-tinted card (not pure white on white — see DESIGN.md's
 * Panel token) so it still reads as a distinct block against the page.
 * Wraps to a second row on narrower widths instead of needing its own
 * breakpoint logic (see ServiceDetailPage.css).
 */
export function IncludedServices({ items }: IncludedServicesProps) {
  return (
    <div className="service-detail__included">
      <h2 className="visually-hidden">Services Include</h2>
      <ul className="service-detail__included-list">
        {items.map((item, index) => {
          const ChipIcon = CHIP_ICONS[index % CHIP_ICONS.length]
          const tone = index % CHIP_TONES
          return (
            <li key={item} className="service-detail__included-item">
              <span className={`service-detail__included-icon service-detail__included-icon--${tone}`} aria-hidden="true">
                <ChipIcon />
              </span>
              <span className="service-detail__included-label">{item}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
