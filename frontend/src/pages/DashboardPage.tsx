import { UserDashboard } from '../components/Dashboard/UserDashboard'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { UserIcon } from '../components/icons/Icons'
import { usePageMeta } from '../lib/usePageMeta'
import './DashboardPage.css'

/**
 * Frontend-only Personal Dashboard / Profile page — all data displayed
 * here is realistic mock state (see data/dashboardData.ts), not a real
 * account; there is no backend call anywhere under this route yet. See
 * UserDashboard.tsx for how the section components are structured so a
 * real API can be wired in later without a redesign.
 */
export function DashboardPage() {
  usePageMeta(
    'My Account | Urban Cool',
    'Manage your Urban Cool profile, address, bookings, and preferences.',
  )

  return (
    <>
      <PageHeader icon={UserIcon} heading="My Account" description="Manage your profile, bookings, and preferences." />
      <section className="dashboard-page">
        <div className="container">
          <UserDashboard />
        </div>
      </section>
    </>
  )
}
