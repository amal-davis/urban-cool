/**
 * The Service Tracking page (ServiceTrackingPage.tsx + components/Tracking/*)
 * is now wired to the real, database-backed booking tracking endpoint (see
 * lib/bookingApi.ts's getBookingTracking/useBookingTracking) — this file
 * used to also hold that page's mock booking/tracking dataset
 * (`mockBookings`/`trackingDetailsByBookingId`/`TRACKING_STATUS_STEPS`/...),
 * which has been removed now that nothing reads it.
 *
 * What's left is the Chat feature's seed data — ChatModal.tsx's "Chat with
 * Technician" is a frontend-only placeholder with no backend of its own yet
 * (see that component's own comment), so its demo messages still live here.
 */

export interface ChatMessage {
  id: string
  sender: 'technician' | 'customer'
  text: string
  /** Pre-formatted for display, not a Date — this is static seed data, not
   *  something a real-time clock needs to stay in sync with. */
  time: string
}

/** A realistic opening exchange, seeded fresh whenever ChatModal mounts.
 *  Frontend state only — no chat backend/WebSocket exists yet (see
 *  ChatModal's own comment on how one would plug in). Returns a fresh array
 *  each call (never a shared mutable module-level array) so ChatModal's own
 *  `useState` can own and append to its copy freely. */
export function createSeedChatMessages(): ChatMessage[] {
  return [
    { id: 'seed-1', sender: 'technician', text: "I'm on my way. I'll reach you shortly.", time: '10:02 AM' },
    { id: 'seed-2', sender: 'customer', text: 'Okay, thank you.', time: '10:03 AM' },
  ]
}
