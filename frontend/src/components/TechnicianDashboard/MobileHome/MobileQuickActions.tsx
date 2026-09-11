import type { ComponentType, SVGProps } from 'react'
import { CameraIcon, DocumentIcon, MapPinIcon, PhoneIcon } from '../../icons/Icons'

interface MobileQuickActionsProps {
  onAction: (label: string) => void
}

interface ActionSpec {
  id: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  tone: number
}

/** The four shortcuts from the mobile design. Like the desktop
 *  QuickActionsSection these are all still unwired — each one needs a job
 *  in context (which job do you call about?), so they surface the same
 *  "coming soon" toast rather than pretending to act. */
const ACTIONS: ActionSpec[] = [
  { id: 'call', label: 'Customer Call', Icon: PhoneIcon, tone: 1 },
  { id: 'maps', label: 'Open Maps', Icon: MapPinIcon, tone: 0 },
  { id: 'report', label: 'Service Report', Icon: DocumentIcon, tone: 2 },
  { id: 'photos', label: 'Upload Photos', Icon: CameraIcon, tone: 3 },
]

export function MobileQuickActions({ onAction }: MobileQuickActionsProps) {
  return (
    <div className="mtech-actions">
      {ACTIONS.map(({ id, label, Icon, tone }) => (
        <button key={id} type="button" className={`mtech-action mtech-action--tone-${tone}`} onClick={() => onAction(label)}>
          <span className="mtech-action__icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="mtech-action__label">{label}</span>
        </button>
      ))}
    </div>
  )
}
