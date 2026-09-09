import type { ComponentType, SVGProps } from 'react'
import { CalendarIcon, CarIcon, CheckCircleIcon, ClockIcon, MapPinIcon, SettingsIcon, TechnicianIcon } from '../icons/Icons'
import { ACTIVE_STATUS_ORDER, bookingStatusLabels, bookingStatusMessages } from '../../lib/bookingApi'
import type { BookingStatus } from '../../lib/bookingApi'

interface StatusTimelineProps {
  /** The booking's current status. Never 'cancelled' here — a cancelled
   *  booking gets its own distinct panel instead of this timeline (see
   *  ServiceTrackingPage.tsx), so this component never needs to represent
   *  that as a "step". */
  status: Exclude<BookingStatus, 'cancelled'>
}

const STEP_ICONS: Record<Exclude<BookingStatus, 'cancelled'>, ComponentType<SVGProps<SVGSVGElement>>> = {
  pending: ClockIcon,
  confirmed: CalendarIcon,
  assigned: TechnicianIcon,
  technician_on_the_way: CarIcon,
  arrived: MapPinIcon,
  in_progress: SettingsIcon,
  completed: CheckCircleIcon,
}

type StepState = 'completed' | 'active' | 'pending'

/**
 * Progress tracker across the real 7-step booking lifecycle (pending ->
 * confirmed -> assigned -> technician_on_the_way -> arrived -> in_progress
 * -> completed — see lib/bookingApi.ts's ACTIVE_STATUS_ORDER, itself
 * mirroring backend/bookings/models.py's Booking.ACTIVE_STATUS_ORDER),
 * entirely driven by that array and the current `status` — never a
 * per-status hardcoded layout, and never a second copy of the status
 * label/message logic (bookingStatusLabels/bookingStatusMessages are the
 * one source both this component and CurrentStatusMessage.tsx read from).
 *
 * One shared markup renders both orientations — CSS alone (TrackingPage.css)
 * switches a horizontal column-per-step layout (desktop, >=901px, matching
 * this same page's own two-column breakpoint) to a vertical stacked list
 * (mobile/tablet). Each step is a "rail" (icon + a connector to the next
 * step) beside its "content" (label + — only on the active step, on mobile
 * only — the current-status message inline, so it reads right next to the
 * step it describes rather than scrolled away below the whole list).
 *
 * The connector between two steps is a single small element per step,
 * sized with pure relative CSS (a fraction of its own rail's box) — never
 * an absolutely-positioned bar computed from magic pixel offsets or the
 * step count.
 *
 * State is never color-only (DESIGN.md's No-Gray-Status Rule, and the
 * brief's own accessibility requirement): each step also gets its own
 * icon, its label, and a visually-hidden state word for screen readers.
 */
export function StatusTimeline({ status }: StatusTimelineProps) {
  const activeIndex = ACTIVE_STATUS_ORDER.findIndex((step) => step === status)

  function stateFor(index: number): StepState {
    if (index < activeIndex) return 'completed'
    if (index === activeIndex) return 'active'
    return 'pending'
  }

  return (
    <ol className="status-timeline" aria-label="Service tracking status">
      {ACTIVE_STATUS_ORDER.map((step, index) => {
        const state = stateFor(index)
        const Icon = STEP_ICONS[step]
        const isLast = index === ACTIVE_STATUS_ORDER.length - 1

        return (
          <li
            key={step}
            className={`status-timeline__step status-timeline__step--${state}`}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className="status-timeline__rail">
              <span className="status-timeline__dot">
                <Icon aria-hidden="true" />
              </span>
              {!isLast && (
                <span
                  className={`status-timeline__connector status-timeline__connector--${state === 'completed' ? 'completed' : 'upcoming'}`}
                  aria-hidden="true"
                />
              )}
            </span>

            <span className="status-timeline__content">
              <span className="status-timeline__label">
                {bookingStatusLabels[step]}
                <span className="visually-hidden">
                  {state === 'completed' ? ' (completed)' : state === 'active' ? ' (current step)' : ' (upcoming)'}
                </span>
              </span>

              {/* Mobile only (hidden on desktop via CSS) — the same message
                  ServiceTrackingPage.tsx already renders once via
                  CurrentStatusMessage below the whole timeline for desktop
                  reading order; shown inline here too so a mobile visitor
                  sees it right next to the step it's about instead of below
                  seven stacked rows. */}
              {state === 'active' && <span className="status-timeline__inline-message">{bookingStatusMessages[step]}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
