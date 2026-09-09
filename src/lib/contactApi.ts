const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export interface ContactFormPayload {
  name: string
  email: string
  phone: string
  message: string
}

export class ContactApiError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ContactApiError'
    this.code = code
  }
}

interface ApiErrorBody {
  detail?: string
  code?: string
}

/**
 * Talks to the Django backend's public contact endpoint (backend/bookings —
 * see backend/bookings/views.py::contact, mounted at POST /api/contact/).
 * Kept isolated like lib/authApi.ts: ContactForm only ever calls
 * submitContactMessage and handles whatever it resolves/rejects with, so
 * swapping the transport later never touches UI code.
 *
 * No `credentials: 'include'` here — unlike auth, a contact submission
 * doesn't establish or rely on a session, so there's no cookie to send.
 */
export async function submitContactMessage(payload: ContactFormPayload): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/contact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ContactApiError('Network error. Check your connection and try again.', 'network_error')
  }

  if (response.ok) {
    return
  }

  let data: ApiErrorBody | null = null
  try {
    data = await response.json()
  } catch {
    // No body / not JSON — data stays null, handled by the fallback message below.
  }

  throw new ContactApiError(data?.detail ?? 'Something went wrong. Please try again.', data?.code)
}
