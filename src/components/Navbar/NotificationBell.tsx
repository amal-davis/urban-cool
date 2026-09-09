import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellIcon,
  BriefcaseIcon,
  CalendarIcon,
  CarIcon,
  CheckCircleIcon,
  CloseIcon,
  ShieldCheckIcon,
  TechnicianIcon,
} from '../icons/Icons'
import {
  getCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
} from '../../lib/customerNotificationsApi'
import type { CustomerNotification, CustomerNotificationType } from '../../lib/customerNotificationsApi'
import './NotificationBell.css'

// Polled, not pushed — there's no websocket in this app yet (same reasoning
// as TechnicianDashboard/NotificationBell.tsx's own comment). Every piece of
// "live" state here (notifications/unreadCount) is plain useState set from
// one `refresh()` call, and the click handlers below only ever update that
// same state — nothing renders straight off a poll-specific code path — so
// swapping this interval for a websocket subscription later only means
// replacing what calls `refresh`/`applyIncoming`, never touching the JSX.
const POLL_INTERVAL_MS = 20_000

const typeIcons: Record<CustomerNotificationType, typeof BellIcon> = {
  booking_created: CalendarIcon,
  technician_assigned: TechnicianIcon,
  booking_accepted: ShieldCheckIcon,
  technician_on_the_way: CarIcon,
  service_started: BriefcaseIcon,
  service_completed: CheckCircleIcon,
  booking_cancelled: CloseIcon,
}

/** "3 min ago" / "2 hr ago" / "5 days ago" — small local formatter, same
 *  shape (and same "one small helper per file that needs it" convention) as
 *  TechnicianDashboard/NotificationBell.tsx's own formatRelativeTime. */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * The site header's notification bell — real data, GET/PATCH/POST
 * /api/customer/notifications/* (lib/customerNotificationsApi.ts). Rendered
 * by Navbar.tsx only while a customer is signed in (see that file's own
 * `isAuthenticated` check) — never for a logged-out visitor, a technician
 * session, or inside the technician app shell (which has its own,
 * independent bell — TechnicianDashboard/NotificationBell.tsx).
 *
 * Polls in the background for the unread badge. Opening the panel does NOT
 * mark anything read by itself (unlike the technician bell) — this app's
 * customer-facing panel needs per-item read state (a notification stays
 * "unread-looking" until the customer actually clicks it or hits "Mark all
 * as read"), since clicking one is also how the customer navigates to its
 * booking.
 */
export function NotificationBell() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  function refresh() {
    getCustomerNotifications()
      .then((data) => {
        setNotifications(data.results)
        setUnreadCount(data.unreadCount)
        setLoadState('ready')
      })
      .catch(() => {
        setLoadState('error')
      })
  }

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function handleNotificationClick(notification: CustomerNotification) {
    setOpen(false)

    if (!notification.isRead) {
      // Optimistic — the item/badge update instantly rather than waiting on
      // the network; a failed mark-read just means the badge can reappear
      // on the next poll, nothing worth interrupting the customer for.
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
      )
      setUnreadCount((current) => Math.max(0, current - 1))
      try {
        await markCustomerNotificationRead(notification.id)
      } catch {
        // See comment above — best-effort only.
      }
    }

    if (notification.bookingId !== null) {
      navigate(`/track/${notification.bookingId}`)
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return

    setUnreadCount(0)
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
    try {
      await markAllCustomerNotificationsRead()
    } catch {
      // Best-effort — same reasoning as handleNotificationClick above.
    }
  }

  return (
    <div className="customer-notifications" ref={wrapperRef}>
      <button
        type="button"
        className="icon-button customer-notifications__toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="customer-notifications__badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="customer-notifications__panel" role="menu">
          <div className="customer-notifications__header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="customer-notifications__mark-all" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {loadState === 'loading' && <p className="customer-notifications__note">Loading…</p>}
          {loadState === 'error' && (
            <p className="customer-notifications__note">Couldn’t load notifications. Pull down to try again later.</p>
          )}
          {loadState === 'ready' && notifications.length === 0 && (
            <p className="customer-notifications__note">No new notifications</p>
          )}
          {loadState === 'ready' && notifications.length > 0 && (
            <ul className="customer-notifications__list">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] ?? BellIcon
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`customer-notifications__item${notification.isRead ? '' : ' is-unread'}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <span className="customer-notifications__item-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="customer-notifications__item-body">
                        <span className="customer-notifications__item-title">{notification.title}</span>
                        <span className="customer-notifications__message">{notification.message}</span>
                        <span className="customer-notifications__time">{formatRelativeTime(notification.createdAt)}</span>
                      </span>
                      {!notification.isRead && <span className="customer-notifications__dot" aria-hidden="true" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            className="customer-notifications__footer-link"
            onClick={() => {
              setOpen(false)
              navigate('/dashboard', { state: { section: 'bookings' } })
            }}
          >
            View All Bookings
          </button>
        </div>
      )}
    </div>
  )
}
