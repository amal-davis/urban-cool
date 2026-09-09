import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ContactApiError, submitContactMessage } from '../../lib/contactApi'
import { Toast } from '../Toast/Toast'
import './ContactForm.css'

type FieldName = 'name' | 'email' | 'phone' | 'message'
type FormValues = Record<FieldName, string>
type FormErrors = Partial<Record<FieldName, string>>
type Status = 'idle' | 'submitting' | 'error'

const initialValues: FormValues = { name: '', email: '', phone: '', message: '' }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) {
    errors.name = 'Enter your name.'
  }

  if (!values.email.trim()) {
    errors.email = 'Enter your email address.'
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  const phoneDigits = values.phone.replace(/\D/g, '')
  if (!values.phone.trim()) {
    errors.phone = 'Enter your phone number.'
  } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (!values.message.trim()) {
    errors.message = 'Enter a message.'
  }

  return errors
}

export function ContactForm() {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  function handleChange(field: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    // Re-validate live only after the field has been touched once, so
    // errors don't appear before the user has had a chance to type anything.
    if (touched[field]) {
      setErrors(validate({ ...values, [field]: value }))
    }
  }

  function handleBlur(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors(validate(values))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validate(values)
    setErrors(validationErrors)
    setTouched({ name: true, email: true, phone: true, message: true })

    const firstInvalidField = (Object.keys(validationErrors) as FieldName[])[0]
    if (firstInvalidField) {
      const refs = { name: nameRef, email: emailRef, phone: phoneRef, message: messageRef }
      refs[firstInvalidField].current?.focus()
      return
    }

    setStatus('submitting')
    try {
      await submitContactMessage(values)
      setStatus('idle')
      setErrorMessage(null)
      setValues(initialValues)
      setTouched({})
      setToastMessage("Message sent — we'll get back to you soon.")
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof ContactApiError
          ? error.message
          : 'Something went wrong sending your message. Please try again, or contact us directly using the phone or email above.',
      )
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className={`form-field${touched.name && errors.name ? ' has-error' : ''}`}>
        <label htmlFor="contact-name">Name</label>
        <input
          ref={nameRef}
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          aria-invalid={touched.name && !!errors.name}
          aria-describedby={touched.name && errors.name ? 'contact-name-error' : undefined}
        />
        {touched.name && errors.name && (
          <span id="contact-name-error" className="form-field__error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className={`form-field${touched.email && errors.email ? ' has-error' : ''}`}>
        <label htmlFor="contact-email">Email</label>
        <input
          ref={emailRef}
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          aria-invalid={touched.email && !!errors.email}
          aria-describedby={touched.email && errors.email ? 'contact-email-error' : undefined}
        />
        {touched.email && errors.email && (
          <span id="contact-email-error" className="form-field__error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div className={`form-field${touched.phone && errors.phone ? ' has-error' : ''}`}>
        <label htmlFor="contact-phone">Phone Number</label>
        <input
          ref={phoneRef}
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          aria-invalid={touched.phone && !!errors.phone}
          aria-describedby={touched.phone && errors.phone ? 'contact-phone-error' : undefined}
        />
        {touched.phone && errors.phone && (
          <span id="contact-phone-error" className="form-field__error" role="alert">
            {errors.phone}
          </span>
        )}
      </div>

      <div className={`form-field${touched.message && errors.message ? ' has-error' : ''}`}>
        <label htmlFor="contact-message">Message</label>
        <textarea
          ref={messageRef}
          id="contact-message"
          name="message"
          rows={5}
          value={values.message}
          onChange={(e) => handleChange('message', e.target.value)}
          onBlur={() => handleBlur('message')}
          aria-invalid={touched.message && !!errors.message}
          aria-describedby={touched.message && errors.message ? 'contact-message-error' : undefined}
        />
        {touched.message && errors.message && (
          <span id="contact-message-error" className="form-field__error" role="alert">
            {errors.message}
          </span>
        )}
      </div>

      <button type="submit" className="btn btn--primary contact-form__submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Send Message'}
      </button>

      {status === 'error' && errorMessage && (
        <p className="contact-form__notice contact-form__notice--error" role="alert">
          {errorMessage}
        </p>
      )}

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </form>
  )
}
