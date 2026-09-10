import './SectionCard.css'

/** Static, frontend-only — no CMS/API for this content yet. */
export function AboutSection() {
  return (
    <div className="section-card">
      <h3 className="section-heading">About Urban Cool</h3>
      <p className="section-text">
        Urban Cool is a home appliance service booking platform built around one idea: getting a technician
        booked should take as few taps as possible. Whether it's an AC that's stopped cooling on a summer
        afternoon or a washing machine that won't drain, the goal is the same — a clear price, a clear time
        window, and a confirmed booking in minutes, not phone calls back and forth.
      </p>
      <p className="section-text">
        We currently cover four appliance categories: AC servicing and repair, refrigerator repair, washing
        machine service, and microwave repair — with routine maintenance and troubleshooting for common
        issues in each. Every booking goes through the same simple flow: pick a service, choose a slot, and
        track it from confirmed to completed right here in your dashboard.
      </p>
      <p className="section-text">
        Urban Cool sign-in is mobile-number based with OTP verification — no passwords to remember, and your
        number stays the way we confirm it's really you.
      </p>
    </div>
  )
}
