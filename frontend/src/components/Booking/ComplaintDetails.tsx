import type { RefObject } from 'react'

interface ComplaintDetailsProps {
  value: string
  error?: string
  touched: boolean
  onChange: (value: string) => void
  onBlur: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

/** "Tell us about the problem" — a single, deliberately short textarea, not
 *  a multi-field diagnostic form. Required (see bookingValidation.ts): a
 *  technician needs to know what's wrong before a visit is useful. */
export function ComplaintDetails({ value, error, touched, onChange, onBlur, textareaRef }: ComplaintDetailsProps) {
  const showError = touched ? error : undefined

  return (
    <div className="booking-section">
      <h2 className="booking-section__heading">Service Requirement</h2>
      <div className={`form-field${showError ? ' has-error' : ''}`}>
        <label htmlFor="booking-complaint">Complaint Details</label>
        <textarea
          ref={textareaRef}
          id="booking-complaint"
          rows={4}
          placeholder="Describe the issue you're experiencing…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!showError}
          aria-describedby={showError ? 'booking-complaint-error' : undefined}
        />
        {showError && (
          <span id="booking-complaint-error" className="form-field__error" role="alert">
            {showError}
          </span>
        )}
      </div>
    </div>
  )
}
