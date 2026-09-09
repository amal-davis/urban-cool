import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellIcon, BriefcaseIcon, CheckCircleIcon, WalletIcon } from '../icons/Icons'
import {
  getTechnicianNotifications,
  markTechnicianNotificationsRead,
} from '../../lib/technicianNotificationsApi'
import type { TechnicianNotification, TechnicianNotificationType } from '../../lib/technicianNotificationsApi'
import './NotificationBell.css'

// Polled, not pushed — there's no websocket in this app, and a new job or a
// status change is low-frequency enough that a short poll reads as "live"
// without the infrastructure a real push channel would need. Same idea as
// lib/bookingApi.ts's own tracking page, which polls every ~12s for a much
// more time-sensitive feed than this one.
const POLL_INTERVAL_MS = 20_000

const typeIcons: Record<TechnicianNotificationType, typeof BellIcon> = {
  assigned: BriefcaseIcon,
  status_update: CheckCircleIcon,
  commission_updated: WalletIcon,
}

/** "3 min ago" / "2 hr ago" / "5 days ago" — falls back to a plain date once
 *  it's further back than that; kept as a small local formatter rather than
 *  a dependency, same "one small helper per file that needs it" convention
 *  this project already follows (see e.g. technicianDashboardData.ts's own
 *  formatAmount). */
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
 * The technician header's notification bell — GET/POST /api/technician/
 * notifications/* (lib/technicianNotificationsApi.ts). Polls in the
 * background for the unread badge; opening the panel shows the latest 5-7
 * (whatever the backend's NOTIFICATION_LIST_LIMIT sends back) and marks
 * every unread notification read, clearing the badge.
 *
 * The panel is positioned relative to TechnicianHeader's own
 * `.tech-header__end` (see that file's own CSS) rather than to this
 * button — flush with the header's actual right edge, same as the profile
 * dropdown beside it, so a clamped width (NotificationBell.css) can never
 * overflow the viewport regardless of where the bell itself sits in the
 * row. That's what keeps this usable on narrow phone screens without a
 * separate mobile-only layout.
 */
export function NotificationBell() {
  const [notifications, setNotifications] = useState<TechnicianNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  function refresh() {
    getTechnicianNotifications()
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

  async function handleToggle() {
    const next = !open
    setOpen(next)
    if (!next || unreadCount === 0) return

    // Optimistic — the badge clears the instant the panel opens, same as
    // every notification-bell pattern a technician would already expect.
    // A failed mark-read just means the badge can reappear on the next
    // poll; nothing worth interrupting the technician for.
    setUnreadCount(0)
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
    try {
      await markTechnicianNotificationsRead()
    } catch {
      // See comment above — best-effort only.
    }
  }

  return (
    <div className="tech-notifications" ref={wrapperRef}>
      <button
        type="button"
        className="icon-button tech-notifications__toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={handleToggle}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="tech-notifications__badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="tech-notifications__panel" role="menu">
          <div className="tech-notifications__header">Notifications</div>

          {loadState === 'loading' && <p className="tech-notifications__note">Loading…</p>}
          {loadState === 'error' && <p className="tech-notifications__note">Couldn’t load notifications.</p>}
          {loadState === 'ready' && notifications.length === 0 && (
            <p className="tech-notifications__note">You’re all caught up — no notifications yet.</p>
          )}
          {loadState === 'ready' && notifications.length > 0 && (
            <ul className="tech-notifications__list">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type]
                return (
                  <li
                    key={notification.id}
                    className={`tech-notifications__item${notification.isRead ? '' : ' is-unread'}`}
                  >
                    <span className="tech-notifications__item-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="tech-notifications__item-body">
                      <span className="tech-notifications__message">{notification.message}</span>
                      <span className="tech-notifications__time">{formatRelativeTime(notification.createdAt)}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          <Link to="/technician/jobs" className="tech-notifications__footer-link" onClick={() => setOpen(false)}>
            View All Jobs
          </Link>
        </div>
      )}
    </div>
  )
}
