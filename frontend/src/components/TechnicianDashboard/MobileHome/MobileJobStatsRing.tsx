import { statusGroup } from '../../../lib/bookingApi'
import type { TechnicianJob } from '../../../lib/technicianJobsApi'

interface MobileJobStatsRingProps {
  jobs: TechnicianJob[]
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Every segment comes from the same `jobs` array the rest of this page runs
 * on, so the four counts always sum to the number in the middle.
 *
 * That's a deliberate choice over blending in GET /api/technician/
 * performance/'s lifetime totals, which is where a bigger "46 completed"
 * figure would come from: mixing a lifetime aggregate with a live snapshot
 * gives you a donut whose slices don't add up to its own total — visibly
 * wrong to anyone who checks the arithmetic. The Performance Summary page
 * (/technician/performance) is where the lifetime view lives.
 */
export function MobileJobStatsRing({ jobs }: MobileJobStatsRingProps) {
  const segments = [
    { key: 'completed', label: 'Completed', tone: 1, count: jobs.filter((job) => job.status === 'completed').length },
    {
      key: 'in-progress',
      label: 'In Progress',
      tone: 0,
      count: jobs.filter((job) => statusGroup(job.status) === 'in-progress').length,
    },
    {
      key: 'pending',
      label: 'Pending',
      tone: 2,
      count: jobs.filter((job) => job.status === 'assigned').length,
    },
    { key: 'cancelled', label: 'Cancelled', tone: 4, count: jobs.filter((job) => job.status === 'cancelled').length },
  ]

  const total = segments.reduce((sum, segment) => sum + segment.count, 0)

  // Walking offset: each arc starts where the previous one ended. With
  // total === 0 nothing is drawn and only the track circle shows, which is
  // the honest picture of "no jobs yet" rather than a full ring of nothing.
  let drawn = 0

  return (
    <div className="mtech-stats">
      <div className="mtech-stats__ring">
        <svg viewBox="0 0 128 128" role="img" aria-label={`${total} jobs in total`}>
          <circle className="mtech-stats__track" cx="64" cy="64" r={RADIUS} />
          {total > 0 &&
            segments.map((segment) => {
              const length = (segment.count / total) * CIRCUMFERENCE
              const offset = drawn
              drawn += length
              return (
                <circle
                  key={segment.key}
                  className={`mtech-stats__arc mtech-stats__arc--tone-${segment.tone}`}
                  cx="64"
                  cy="64"
                  r={RADIUS}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={-offset}
                />
              )
            })}
        </svg>
        <div className="mtech-stats__center">
          <span className="mtech-stats__total">{total}</span>
          <span className="mtech-stats__total-label">Total Jobs</span>
        </div>
      </div>

      <ul className="mtech-stats__legend">
        {segments.map((segment) => (
          <li key={segment.key} className="mtech-stats__legend-row">
            <span className={`mtech-stats__swatch mtech-stats__swatch--tone-${segment.tone}`} aria-hidden="true" />
            <span className="mtech-stats__legend-label">{segment.label}</span>
            <span className="mtech-stats__legend-count">{segment.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
