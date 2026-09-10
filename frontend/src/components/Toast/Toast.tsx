import { useEffect, useRef } from 'react'
import { CheckCircleIcon } from '../icons/Icons'
import './Toast.css'

interface ToastProps {
  /** null = nothing to show — the caller owns the message's lifecycle
   *  (e.g. `const [toast, setToast] = useState<string | null>(null)`), this
   *  component only renders it and calls back when its time is up. */
  message: string | null
  onDismiss: () => void
  /** Milliseconds before auto-dismiss. */
  duration?: number
}

/**
 * Small auto-dismissing confirmation banner — this project has no toast/
 * notification system yet (checked before adding this), so this is a first,
 * deliberately generic one: no dashboard-specific import here, so any future
 * feature (booking confirmations, etc.) can reuse it the same way
 * EditProfileModal does.
 */
export function Toast({ message, onDismiss, duration = 3200 }: ToastProps) {
  // Always current without needing to be a dependency below — same
  // "ref instead of a re-running effect" approach as Modal.tsx's onClose,
  // assigned in an effect rather than during render for the same reason.
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => onDismissRef.current(), duration)
    return () => window.clearTimeout(timer)
    // Keyed on `message`/`duration` alone, deliberately — see the ref above
    // for why the callback isn't in this dependency list.
  }, [message, duration])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <CheckCircleIcon className="toast__icon" />
      <span className="toast__message">{message}</span>
    </div>
  )
}
