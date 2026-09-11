import { useMemo, useState } from 'react'
import { ChevronRightIcon } from '../../icons/Icons'
import type { TechnicianJob } from '../../../lib/technicianJobsApi'
import { serviceVisual } from './serviceVisuals'

interface MobileWeekScheduleProps {
  jobs: TechnicianJob[]
  onOpenJob: (job: TechnicianJob) => void
}

interface DaySpec {
  iso: string
  weekday: string
  dayOfMonth: string
  jobs: TechnicianJob[]
}

function isoFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * A seven-day strip starting today, with each day's real job count, and the
 * selected day's jobs listed underneath.
 *
 * Deliberately "today plus six" rather than a Monday–Sunday calendar week:
 * that's the same window `isJobThisWeek` already defines (see
 * technicianJobsApi.ts), and a technician opening this on a Thursday wants
 * the next seven days of work, not three past days and four future ones.
 */
export function MobileWeekSchedule({ jobs, onOpenJob }: MobileWeekScheduleProps) {
  const days = useMemo<DaySpec[]>(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
      const iso = isoFor(date)
      return {
        iso,
        weekday: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayOfMonth: String(date.getDate()),
        jobs: jobs.filter((job) => job.bookingDate === iso),
      }
    })
  }, [jobs])

  const [selectedIso, setSelectedIso] = useState(days[0].iso)
  const selected = days.find((day) => day.iso === selectedIso) ?? days[0]
  const selectedLabel = new Date(`${selected.iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="mtech-week">
      <div className="mtech-week__strip" role="group" aria-label="Next seven days">
        {days.map((day) => {
          const isSelected = day.iso === selected.iso
          return (
            <button
              key={day.iso}
              type="button"
              className={`mtech-day${isSelected ? ' mtech-day--selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedIso(day.iso)}
            >
              <span className="mtech-day__weekday">{day.weekday}</span>
              <span className="mtech-day__date">{day.dayOfMonth}</span>
              <span className="mtech-day__count">
                {day.jobs.length} {day.jobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mtech-week__selected">
        <p className="mtech-week__selected-date">{selectedLabel}</p>
        <p className="mtech-week__selected-count">
          {selected.jobs.length} {selected.jobs.length === 1 ? 'Job' : 'Jobs'}
        </p>
      </div>

      {selected.jobs.length === 0 ? (
        <p className="mtech-week__empty">No jobs scheduled for this day.</p>
      ) : (
        <ul className="mtech-week__list">
          {selected.jobs.map((job) => {
            const { tone } = serviceVisual(job.serviceName)
            return (
              <li key={job.id}>
                <button type="button" className="mtech-slot" onClick={() => onOpenJob(job)}>
                  <span className="mtech-slot__time">{job.timeSlotLabel}</span>
                  <span className={`mtech-slot__dot mtech-slot__dot--tone-${tone}`} aria-hidden="true" />
                  <span className="mtech-slot__body">
                    <span className="mtech-slot__service">{job.serviceName}</span>
                    <span className="mtech-slot__customer">
                      {job.customerName}, {job.city}
                    </span>
                  </span>
                  <ChevronRightIcon className="mtech-slot__chevron" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
