import { TechnicianIcon } from '../icons/Icons'
import { TechnicianCard } from './TechnicianCard'

interface TechnicianSectionProps {
  /** Both null until an admin assigns a technician (see
   *  backend/bookings/serializers.py's BookingTrackingSerializer) — never
   *  one set without the other. */
  technicianName: string | null
  technicianPhone: string | null
}

/** Heading + TechnicianCard once a technician exists; a clearly-pending
 *  state instead of a fabricated technician when nobody's been assigned
 *  yet. */
export function TechnicianSection({ technicianName, technicianPhone }: TechnicianSectionProps) {
  if (!technicianName || !technicianPhone) {
    return (
      <div className="tracking-section">
        <h2 className="tracking-section__heading">Technician Assignment</h2>
        <div className="technician-pending">
          <span className="technician-pending__icon" aria-hidden="true">
            <TechnicianIcon />
          </span>
          <p>Your technician will be assigned shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tracking-section">
      <h2 className="tracking-section__heading">Technician Assigned</h2>
      <TechnicianCard name={technicianName} phone={technicianPhone} />
    </div>
  )
}
