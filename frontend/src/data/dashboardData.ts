/**
 * Frontend-only mock data for the parts of the Personal Dashboard that
 * aren't wired to a real backend yet — notification toggles. Profile,
 * address, and bookings are all real, backend-fetched data now (see
 * lib/customerApi.ts, lib/bookingApi.ts, lib/AuthContext.tsx, and
 * UserDashboard.tsx, which owns fetching all three) — their old mock
 * versions (`DashboardUser`/`mockUser`, `Address`/`mockAddresses`,
 * `Booking`/`BookingStatus`/`mockBookings`) have been removed from here
 * rather than left as unused dead code. Payment method preference (`
 * PaymentMethodId`/`paymentMethodOptions`/`DEFAULT_PAYMENT_METHOD_ID`) was
 * removed the same way once the Payment Method dashboard section itself
 * was removed — it was never wired to a real backend either.
 */

export interface NotificationPreferences {
  bookingReminders: boolean
  serviceUpdates: boolean
  promotionalOffers: boolean
}

export const mockNotificationPreferences: NotificationPreferences = {
  bookingReminders: true,
  serviceUpdates: true,
  promotionalOffers: false,
}

export interface FaqEntry {
  question: string
  answer: string
}

export const supportFaqs: FaqEntry[] = [
  {
    question: 'How do I book a service?',
    answer:
      'Go to Services, pick your appliance, and choose a slot — you’ll get a booking confirmation with a Booking ID right away.',
  },
  {
    question: 'Can I reschedule or cancel a booking?',
    answer:
      'Yes — open the booking under My Bookings and use the reschedule or cancel option. Upcoming bookings can be changed until the technician is dispatched.',
  },
  {
    question: 'How do I sign in without a password?',
    answer:
      'Urban Cool uses OTP-based sign-in — enter your mobile number and verify the one-time code sent to it. No password to remember.',
  },
]
