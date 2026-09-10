import { TechnicianLoginCard } from '../components/TechnicianAuth/TechnicianLoginCard'
import { usePageMeta } from '../lib/usePageMeta'
import './LoginPage.css'

/**
 * A completely separate login page/route from the customer LoginPage
 * (/login) — same page-level layout (reuses LoginPage.css's generic
 * .login-page/.login-page__container, not customer-specific despite the
 * filename) but its own card/flow (TechnicianLoginCard), so customers and
 * technicians never share a sign-in form even though they visually look
 * like siblings.
 */
export function TechnicianLoginPage() {
  usePageMeta(
    'Technician Login | Urban Cool',
    'Urban Cool Technician Portal — sign in with your registered mobile number to view your assigned jobs.',
  )

  return (
    <section className="login-page">
      <div className="container login-page__container">
        <TechnicianLoginCard />
      </div>
    </section>
  )
}
