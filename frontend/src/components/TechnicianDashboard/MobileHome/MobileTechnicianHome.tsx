import { TechSectionHeader } from '../TechSectionHeader'
import { MobileGreetingBanner } from './MobileGreetingBanner'
import { MobileStatPills } from './MobileStatPills'
import { MobileJobCard } from './MobileJobCard'
import { MobileWeekSchedule } from './MobileWeekSchedule'
import { MobileEarningsSection } from './MobileEarningsSection'
import { MobileJobStatsRing } from './MobileJobStatsRing'
import { MobileQuickActions } from './MobileQuickActions'
import { MobileBanner } from './MobileBanner'
import { isJobThisWeek, isJobToday, isJobTomorrow } from '../../../lib/technicianJobsApi'
import type { TechnicianJob } from '../../../lib/technicianJobsApi'
import type { TechnicianEarnings } from '../../../lib/technicianEarningsApi'
import './MobileTechnicianHome.css'

type LoadState = 'loading' | 'error' | 'ready'

interface MobileTechnicianHomeProps {
  technicianName: string
  jobs: TechnicianJob[]
  jobsLoadState: LoadState
  earnings: TechnicianEarnings | null
  earningsLoadState: LoadState
  onOpenJob: (job: TechnicianJob) => void
  onQuickAction: (label: string) => void
}

/**
 * The technician home as it renders below 1024px — a different composition
 * from the desktop dashboard, not a narrowed copy of it (see
 * TechnicianDashboardPage.tsx for the switch, and why only one of the two
 * is ever mounted).
 *
 * Everything here runs on the same three fetches the desktop page already
 * makes; this component takes the results as props and never fetches for
 * itself, so switching between the two layouts on a resize costs no extra
 * requests.
 */
export function MobileTechnicianHome({
  technicianName,
  jobs,
  jobsLoadState,
  earnings,
  earningsLoadState,
  onOpenJob,
  onQuickAction,
}: MobileTechnicianHomeProps) {
  const ready = jobsLoadState === 'ready'
  const todaysJobs = jobs.filter((job) => isJobToday(job.bookingDate))
  const tomorrowsJobs = jobs.filter((job) => isJobTomorrow(job.bookingDate))

  return (
    <div className="mtech">
      {/* Scroll targets for the sidebar's in-page nav — see
          mobileSections.ts for which nav item points at which. */}
      <div id="mtech-top" className="mtech__anchor" />
      <MobileGreetingBanner name={technicianName} />

      <MobileStatPills
        todayCount={ready ? todaysJobs.length : null}
        tomorrowCount={ready ? tomorrowsJobs.length : null}
        weekCount={ready ? jobs.filter((job) => isJobThisWeek(job.bookingDate)).length : null}
        completedCount={ready ? jobs.filter((job) => job.status === 'completed').length : null}
      />

      <section id="mtech-today" className="mtech__section">
        <TechSectionHeader title="Today’s Jobs" linkTo="/technician/jobs" linkLabel="View All" />
        {jobsLoadState === 'loading' && <p className="tech-empty-note">Loading your jobs…</p>}
        {jobsLoadState === 'error' && <p className="tech-empty-note">Couldn’t load your jobs. Please refresh the page.</p>}
        {ready &&
          (todaysJobs.length > 0 ? (
            <div className="mtech__job-list">
              {todaysJobs.map((job) => (
                <MobileJobCard key={job.id} job={job} variant="full" onOpen={onOpenJob} />
              ))}
            </div>
          ) : (
            <p className="tech-empty-note">No jobs scheduled for today.</p>
          ))}
      </section>

      <section className="mtech__section">
        <TechSectionHeader title="Tomorrow’s Jobs" linkTo="/technician/upcoming-jobs" linkLabel="View All" />
        {ready &&
          (tomorrowsJobs.length > 0 ? (
            <div className="mtech__job-list">
              {tomorrowsJobs.map((job) => (
                <MobileJobCard key={job.id} job={job} variant="compact" onOpen={onOpenJob} />
              ))}
            </div>
          ) : (
            <p className="tech-empty-note">Nothing booked for tomorrow yet.</p>
          ))}
      </section>

      <MobileBanner variant="encouragement" />

      <section id="mtech-schedule" className="mtech__section">
        <TechSectionHeader title="This Week’s Schedule" linkTo="/technician/upcoming-jobs" linkLabel="View All" />
        {ready ? (
          <MobileWeekSchedule jobs={jobs} onOpenJob={onOpenJob} />
        ) : (
          <p className="tech-empty-note">
            {jobsLoadState === 'error' ? 'Couldn’t load your schedule.' : 'Loading your schedule…'}
          </p>
        )}
      </section>

      <section id="mtech-earnings" className="mtech__section">
        <TechSectionHeader title="Earnings" linkTo="/technician/earnings" linkLabel="View Details" />
        {earningsLoadState === 'loading' && <p className="tech-empty-note">Loading your earnings…</p>}
        {earningsLoadState === 'error' && (
          <p className="tech-empty-note">Couldn’t load your earnings. Please refresh the page.</p>
        )}
        {earningsLoadState === 'ready' && earnings && <MobileEarningsSection earnings={earnings} />}
      </section>

      <section id="mtech-stats" className="mtech__section">
        <TechSectionHeader title="Job Statistics" />
        {ready ? (
          <MobileJobStatsRing jobs={jobs} />
        ) : (
          <p className="tech-empty-note">
            {jobsLoadState === 'error' ? 'Couldn’t load your job statistics.' : 'Loading your job statistics…'}
          </p>
        )}
      </section>

      <section className="mtech__section">
        <TechSectionHeader title="Quick Actions" />
        <MobileQuickActions onAction={onQuickAction} />
      </section>

      <MobileBanner variant="quote" />
    </div>
  )
}
