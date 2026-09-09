import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon, LogoutIcon, PencilIcon } from '../icons/Icons'
import { formatGroupedIndianMobile, fromE164 } from '../../lib/indianPhone'
import { initialsFor } from '../../lib/initials'
import { useAuth } from '../../lib/AuthContext'
import type { CustomerProfile } from '../../lib/customerApi'
import './ProfileHeader.css'

interface ProfileHeaderProps {
  customer: CustomerProfile
  onEditClick: () => void
}

/** Top-of-sidebar / top-of-mobile-list profile summary — avatar, name,
 *  verified phone, Edit Profile. Same component renders it in both the
 *  desktop sidebar and the mobile list (DashboardPage.css repositions/
 *  resizes it per breakpoint); it's never squeezed-desktop-card-on-mobile,
 *  it's one shared piece of markup styled twice.
 *
 *  Always initials, never a photo — there's no avatar-upload feature (the
 *  old mock's `avatarUrl` was always null too; this just drops the dead
 *  branch now that CustomerProfile, the real API shape, never has one).
 *
 *  Log Out lives here too, right beside Edit Profile — this is the one
 *  surface guaranteed visible the instant the dashboard opens (desktop
 *  sidebar and mobile list alike), unlike SettingsSection's own Log Out
 *  button, which stays as a second, less-buried place to find it but
 *  requires opening Settings first. */
export function ProfileHeader({ customer, onEditClick }: ProfileHeaderProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  async function handleLogout() {
    // Best-effort — same reasoning as SettingsSection's own handleLogout:
    // local auth state is always cleared regardless of whether the backend
    // call itself succeeds (e.g. an already-expired session).
    try {
      await logout()
    } finally {
      navigate('/')
    }
  }

  return (
    <div className="profile-summary">
      <div className="profile-summary__avatar" aria-hidden="true">
        <span className="profile-summary__avatar-initials">{initialsFor(customer.name)}</span>
      </div>

      {/* h2, not h1 — DashboardPage's PageHeader already carries the page's
          one h1 ("My Account"), visually-hidden on mobile but still present
          in the accessibility tree there (see PageHeader.css). */}
      <h2 className="profile-summary__name">{customer.name}</h2>

      <p className="profile-summary__phone">
        +91 {formatGroupedIndianMobile(fromE164(customer.mobileNumber))}
        <span className="profile-summary__verified">
          <CheckCircleIcon /> Verified
        </span>
      </p>

      <div className="profile-summary__actions">
        <button type="button" className="btn btn--ghost profile-summary__edit" onClick={onEditClick}>
          <PencilIcon /> Edit Profile
        </button>
        <button type="button" className="btn btn--ghost profile-summary__logout" onClick={handleLogout}>
          <LogoutIcon /> Log Out
        </button>
      </div>
    </div>
  )
}
