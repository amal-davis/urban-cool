import { CheckCircleIcon, PencilIcon } from '../../icons/Icons'
import { formatGroupedIndianMobile, fromE164 } from '../../../lib/indianPhone'
import type { CustomerProfile } from '../../../lib/customerApi'
import './SectionCard.css'

interface ProfileOverviewSectionProps {
  customer: CustomerProfile
  onEditClick: () => void
}

/** Desktop-only in practice — the content panel's default section before
 *  any menu row is clicked (see UserDashboard.tsx). Mobile never reaches
 *  this: there's no "My Profile" row in the menu, since the profile
 *  summary itself is always on-screen there (see the mobile reference). */
export function ProfileOverviewSection({ customer, onEditClick }: ProfileOverviewSectionProps) {
  return (
    <div className="section-card">
      <h3 className="section-heading">Account Details</h3>
      <div className="detail-list">
        <div className="detail-row">
          <span className="detail-row__label">Full Name</span>
          <span className="detail-row__value">{customer.name}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row__label">Mobile Number</span>
          <span className="detail-row__value">
            +91 {formatGroupedIndianMobile(fromE164(customer.mobileNumber))}{' '}
            <CheckCircleIcon className="detail-row__verified-icon" />
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-row__label">Email Address</span>
          <span className="detail-row__value">{customer.email}</span>
        </div>
        {customer.memberSince && (
          <div className="detail-row">
            <span className="detail-row__label">Member Since</span>
            <span className="detail-row__value">{customer.memberSince}</span>
          </div>
        )}
      </div>
      <button type="button" className="btn btn--ghost section-card__action" onClick={onEditClick}>
        <PencilIcon /> Edit Profile
      </button>
    </div>
  )
}
