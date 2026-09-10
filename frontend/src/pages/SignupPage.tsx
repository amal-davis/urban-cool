import { SignupCard } from '../components/Auth/SignupCard'
import { usePageMeta } from '../lib/usePageMeta'
import './SignupPage.css'

// Mirrors LoginPage.tsx exactly on purpose — no separate page-level heading
// wraps the card. SignupCard's own steps already carry a heading + subtext
// each ("Create your account" / "Verify your mobile number" / "Almost
// there!"), so an outer "Create Your Account" heading here would just
// duplicate Step 1's H1 a few pixels above it. Same structural shape as
// Login keeps the two auth pages visually and architecturally consistent.
export function SignupPage() {
  usePageMeta(
    'Sign Up | Urban Cool',
    'Create your Urban Cool account with your mobile number to book and manage appliance repair services.',
  )

  return (
    <section className="signup-page">
      <div className="container signup-page__container">
        <SignupCard />
      </div>
    </section>
  )
}
