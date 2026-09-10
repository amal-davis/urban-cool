/**
 * Frontend-only "demo mode" — on whenever VITE_API_URL isn't set (see
 * .env.example), which is exactly the case for the GitHub Pages build (no
 * backend is deployed there yet). Every lib/*Api.ts module checks DEMO_MODE
 * and, when it's on, resolves with realistic fake data instead of making a
 * network call — so every dynamic page (Services, Booking, Tracking, the
 * customer dashboard, the technician dashboard) has something real to show
 * on the live site with no backend running anywhere. Setting VITE_API_URL to
 * a real deployed backend (a real .env, or the GitHub Actions build env)
 * switches every module back to real network calls automatically — nothing
 * else to flip, and no code here needs to change.
 *
 * Mock state each module keeps (mutable arrays for bookings/jobs/
 * notifications, the fake session in demoSession.ts) lives in memory only —
 * it resets on a full page reload, not on client-side navigation, so a demo
 * session stays consistent (a job status change, a new booking, a profile
 * edit all stick) for as long as the tab stays open. Deliberately no
 * localStorage/sessionStorage backing any of it: this is a demo, not real
 * persistence.
 */
export const DEMO_MODE = !import.meta.env.VITE_API_URL

/** Small artificial delay so demo interactions still feel like a network
 *  round-trip rather than resolving instantly — every demo fallback awaits
 *  this before resolving/rejecting. */
export function demoDelay(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let idCounter = 9000

/** A fresh id for anything created in demo mode (a new booking, a new
 *  address, ...) — starts well above every hand-picked seed id below so the
 *  two never collide. */
export function nextDemoId(): number {
  idCounter += 1
  return idCounter
}
