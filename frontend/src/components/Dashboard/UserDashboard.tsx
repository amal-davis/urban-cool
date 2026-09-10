import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronLeftIcon } from '../icons/Icons'
import { ProfileHeader } from './ProfileHeader'
import { DashboardMenu } from './DashboardMenu'
import { EditProfileModal } from './EditProfileModal'
import { dashboardMenuItems } from './dashboardMenuItems'
import type { DashboardSectionId } from './dashboardMenuItems'
import { ProfileOverviewSection } from './sections/ProfileOverviewSection'
import { AddressSection } from './sections/AddressSection'
import { BookingsSection } from './sections/BookingsSection'
import { SupportSection } from './sections/SupportSection'
import { AboutSection } from './sections/AboutSection'
import { PrivacySection } from './sections/PrivacySection'
import { SettingsSection } from './sections/SettingsSection'
import { Toast } from '../Toast/Toast'
import { useAuth } from '../../lib/AuthContext'
import { createAddress, deleteAddress, getAddress, updateAddress } from '../../lib/customerApi'
import type { AddressInput, CustomerAddress } from '../../lib/customerApi'
import { getMyBookings } from '../../lib/bookingApi'
import type { BookingListItem } from '../../lib/bookingApi'
import { mockNotificationPreferences } from '../../data/dashboardData'
import type { NotificationPreferences } from '../../data/dashboardData'
import './UserDashboard.css'

/**
 * Owns every piece of real "server state" the dashboard shows. Profile comes
 * from AuthContext (already loaded by the time this renders — see
 * ProtectedRoute); address/bookings are fetched here on mount, since
 * they're dashboard-specific rather than app-wide auth state. Notification
 * preferences stay frontend-only mock state — out of scope for this pass
 * (see dashboardData.ts's own comment); bookings has no setter
 * of its own either, since nothing here mutates them (a booking's status
 * only ever changes via the admin/technician workflow).
 *
 * Also owns `activeSection`, which is the whole "desktop sidebar+panel /
 * mobile list+detail" layout in one piece of state — see the JSX below and
 * UserDashboard.css for how the same state drives both.
 */
export function UserDashboard() {
  const { customer, setCustomer, refresh } = useAuth()
  const location = useLocation()

  const [address, setAddress] = useState<CustomerAddress | null>(null)
  const [addressLoading, setAddressLoading] = useState(true)
  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [notifications, setNotifications] = useState<NotificationPreferences>(mockNotificationPreferences)

  // Lets a caller land directly on a section — e.g. the notification bell's
  // "View All Bookings" (Navbar/NotificationBell.tsx) navigates here with
  // `state: { section: 'bookings' }` rather than always opening on Profile.
  // Read once via useState's lazy initializer (this dashboard has no other
  // use for the URL/history state, and re-reading it on every render would
  // fight the user's own subsequent menu clicks); an unrecognized or absent
  // section falls back to the normal default.
  const [activeSection, setActiveSection] = useState<DashboardSectionId | null>(() => {
    const requested = (location.state as { section?: DashboardSectionId } | null)?.section
    return requested && dashboardMenuItems.some((item) => item.id === requested) ? requested : null
  })

  // Re-syncs on every *navigation* to this route (location.key changes on
  // each history entry, even ones that land back on the same path), not
  // just on mount. Without this, the mobile bottom nav's Bookings and
  // Profile tabs — both routed to plain "/dashboard", distinguished only by
  // this state — did nothing when tapped one after the other: React Router
  // doesn't remount a route just because its `state` differs, so the lazy
  // initializer above never re-ran and activeSection sat stuck on whichever
  // section was already showing. This intentionally does NOT depend on
  // `location.state` directly — that object is a fresh reference on every
  // render even without a real navigation, which would fight the user's own
  // later in-page menu clicks (setActiveSection calls, same as before).
  useEffect(() => {
    const requested = (location.state as { section?: DashboardSectionId } | null)?.section
    setActiveSection(requested && dashboardMenuItems.some((item) => item.id === requested) ? requested : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    // Re-fetches the profile fresh on every dashboard visit. Signup's own
    // AuthContext.setCustomer (SignupCard.tsx) has no date_joined to seed
    // memberSince with — this guarantees the dashboard reflects the real
    // backend record regardless of which flow (Signup vs. Login) got the
    // customer here.
    refresh()

    let cancelled = false
    setAddressLoading(true)
    getAddress()
      .then((result) => {
        if (!cancelled) setAddress(result)
      })
      .catch(() => {
        // No address-fetch failure is fatal to viewing the dashboard —
        // worst case this shows the same "no address yet" state a
        // brand-new customer would see, which is still an honest reflection
        // of "nothing to show," not a broken page.
        if (!cancelled) setAddress(null)
      })
      .finally(() => {
        if (!cancelled) setAddressLoading(false)
      })

    setBookingsLoading(true)
    getMyBookings()
      .then((result) => {
        if (!cancelled) setBookings(result)
      })
      .catch(() => {
        // Same reasoning as the address fetch above — an empty list is a
        // safe, honest fallback rather than a broken page.
        if (!cancelled) setBookings([])
      })
      .finally(() => {
        if (!cancelled) setBookingsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Deliberately mount-only — refresh/getAddress/getMyBookings aren't
    // re-run on every render, only once when the dashboard is actually
    // opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAddAddress(values: AddressInput) {
    // Errors intentionally propagate — AddressSection's own form catches
    // them and shows the message inline, same shape as EditProfileModal.
    const created = await createAddress(values)
    setAddress(created)
    setToastMessage('Address added.')
  }

  async function handleUpdateAddress(values: AddressInput) {
    const updated = await updateAddress(values)
    setAddress(updated)
    setToastMessage('Address updated.')
  }

  async function handleDeleteAddress() {
    await deleteAddress()
    setAddress(null)
    setToastMessage('Address removed.')
  }

  function handleToggleNotification(key: keyof NotificationPreferences) {
    setNotifications((current) => ({ ...current, [key]: !current[key] }))
  }

  // Guaranteed non-null in practice — ProtectedRoute only renders this
  // component once AuthContext's status is 'authenticated', which is set
  // together with `customer` in the same place (see AuthContext.tsx). The
  // guard just gives the rest of this component a non-null type to work
  // with instead of `customer!` everywhere.
  if (!customer) return null

  const activeSectionLabel =
    activeSection === null || activeSection === 'profile'
      ? 'My Profile'
      : dashboardMenuItems.find((item) => item.id === activeSection)?.label

  // An arrow function assigned to a const, not a hoisted `function`
  // declaration — TS only carries the `if (!customer) return null` guard
  // above into a closure defined (not just called) after it, which a plain
  // function declaration doesn't count as.
  const renderContent = () => {
    switch (activeSection ?? 'profile') {
      case 'address':
        return (
          <AddressSection
            address={address}
            loading={addressLoading}
            onAdd={handleAddAddress}
            onUpdate={handleUpdateAddress}
            onDelete={handleDeleteAddress}
          />
        )
      case 'bookings':
        return <BookingsSection bookings={bookings} loading={bookingsLoading} />
      case 'support':
        return <SupportSection />
      case 'about':
        return <AboutSection />
      case 'privacy':
        return <PrivacySection />
      case 'settings':
        return <SettingsSection preferences={notifications} onToggle={handleToggleNotification} />
      case 'profile':
      default:
        return <ProfileOverviewSection customer={customer} onEditClick={() => setEditModalOpen(true)} />
    }
  }

  return (
    <div className="dashboard">
      {/* Sidebar on desktop (always visible); the mobile "list" view
          otherwise — hidden on mobile only once a section is selected, via
          the is-hidden-on-mobile class below (see UserDashboard.css). */}
      <div className={`dashboard__sidebar${activeSection ? ' is-hidden-on-mobile' : ''}`}>
        <ProfileHeader customer={customer} onEditClick={() => setEditModalOpen(true)} />
        <DashboardMenu activeSection={activeSection} onSelect={setActiveSection} />
      </div>

      {/* Content panel on desktop (always visible, defaults to My Profile);
          the mobile "detail" view otherwise — only visible once a section
          is selected. */}
      <div className={`dashboard__content${!activeSection ? ' is-hidden-on-mobile' : ''}`}>
        <div className="dashboard__content-header">
          <button
            type="button"
            className="dashboard__back"
            onClick={() => setActiveSection(null)}
            aria-label="Back to account menu"
          >
            <ChevronLeftIcon /> Back
          </button>
          <h2 className="dashboard__content-title">{activeSectionLabel}</h2>
        </div>
        <div className="dashboard__content-body">{renderContent()}</div>
      </div>

      <EditProfileModal
        open={editModalOpen}
        customer={customer}
        onClose={() => setEditModalOpen(false)}
        onSaved={(updated) => {
          setCustomer(updated)
          setToastMessage('Profile updated successfully.')
        }}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  )
}
