import { LoginCard } from '../components/Auth/LoginCard'
import { usePageMeta } from '../lib/usePageMeta'
import './LoginPage.css'

export function LoginPage() {
  usePageMeta(
    'Log In | Urban Cool',
    'Sign in to Urban Cool with your mobile number to book and manage appliance repair services.',
  )

  return (
    <section className="login-page">
      <div className="container login-page__container">
        <LoginCard />
      </div>
    </section>
  )
}
