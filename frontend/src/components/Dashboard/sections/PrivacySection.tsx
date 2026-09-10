import './SectionCard.css'

/**
 * Frontend-only placeholder — no dedicated Privacy Policy route exists yet
 * anywhere in the project (checked App.tsx/Footer.tsx before writing this),
 * so this lives here as a content section rather than a separate page. If a
 * real /privacy route is added later, this menu item should link there
 * instead (see UserDashboard.tsx's dashboardMenuItems wiring).
 */
export function PrivacySection() {
  return (
    <div className="section-card">
      <h3 className="section-heading">Privacy Policy</h3>
      <p className="section-text">
        This is a placeholder summary of how Urban Cool would handle your information — it isn't a
        finalized legal policy yet.
      </p>

      <h4 className="section-heading">Information We Collect</h4>
      <p className="section-text">
        Your mobile number (for OTP sign-in), name and email address, and the service address and booking
        details you provide when scheduling a repair.
      </p>

      <h4 className="section-heading">How We Use It</h4>
      <p className="section-text">
        To verify your identity, confirm and manage your bookings, and contact you about the status of a
        service. We don't sell your information to third parties.
      </p>

      <h4 className="section-heading">Your Choices</h4>
      <p className="section-text">
        You can update your profile details at any time from this dashboard, and control promotional/update
        notifications under Settings.
      </p>

      <h4 className="section-heading">Contact</h4>
      <p className="section-text">Questions about your data can be sent through the Contact Us page.</p>
    </div>
  )
}
