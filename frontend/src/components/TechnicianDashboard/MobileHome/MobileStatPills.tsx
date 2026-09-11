import type { ComponentType, SVGProps } from 'react'
import { BriefcaseIcon, CalendarIcon, CheckCircleIcon, ClockIcon } from '../../icons/Icons'

interface MobileStatPillsProps {
  /** Null while the underlying fetch is still in flight or failed — every
   *  pill renders an em dash rather than a misleading 0. */
  todayCount: number | null
  tomorrowCount: number | null
  weekCount: number | null
  completedCount: number | null
}

interface PillSpec {
  key: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  value: number | null
  label: string
  tone: number
}

/** Four at-a-glance counts across the top of the mobile home. Each carries
 *  its own tone (see the `--tone-N` classes in MobileTechnicianHome.css) —
 *  the one place on this surface where colour is doing categorisation work
 *  rather than decoration, which is what earns it here. */
export function MobileStatPills({ todayCount, tomorrowCount, weekCount, completedCount }: MobileStatPillsProps) {
  const pills: PillSpec[] = [
    { key: 'today', Icon: BriefcaseIcon, value: todayCount, label: 'Today’s Jobs', tone: 0 },
    { key: 'tomorrow', Icon: ClockIcon, value: tomorrowCount, label: 'Tomorrow', tone: 2 },
    { key: 'week', Icon: CalendarIcon, value: weekCount, label: 'This Week', tone: 1 },
    { key: 'completed', Icon: CheckCircleIcon, value: completedCount, label: 'Completed', tone: 3 },
  ]

  return (
    <ul className="mtech-pills">
      {pills.map(({ key, Icon, value, label, tone }) => (
        <li key={key} className={`mtech-pill mtech-pill--tone-${tone}`}>
          <span className="mtech-pill__icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="mtech-pill__value">{value === null ? '—' : value}</span>
          <span className="mtech-pill__label">{label}</span>
        </li>
      ))}
    </ul>
  )
}
