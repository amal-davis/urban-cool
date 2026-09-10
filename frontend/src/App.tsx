import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar/Navbar'
import { MobileMenu } from './components/Navbar/MobileMenu'
import { MobileBottomNav } from './components/MobileBottomNav/MobileBottomNav'
import { Footer } from './components/Footer/Footer'
import { PageTransitionSpinner } from './components/PageTransitionSpinner/PageTransitionSpinner'
import { ProtectedRoute } from './components/ProtectedRoute'
import { TechnicianProtectedRoute } from './components/TechnicianProtectedRoute'
import { HomePageSkeleton } from './pages/skeletons/HomePageSkeleton'
import { ServicesPageSkeleton } from './pages/skeletons/ServicesPageSkeleton'
import { ServiceDetailPageSkeleton } from './pages/skeletons/ServiceDetailPageSkeleton'
import { BookingPageSkeleton } from './pages/skeletons/BookingPageSkeleton'
import { ServiceTrackingPageSkeleton } from './pages/skeletons/ServiceTrackingPageSkeleton'
import { ContactPageSkeleton } from './pages/skeletons/ContactPageSkeleton'
import { LoginPageSkeleton } from './pages/skeletons/LoginPageSkeleton'
import { SignupPageSkeleton } from './pages/skeletons/SignupPageSkeleton'
import { DashboardPageSkeleton } from './pages/skeletons/DashboardPageSkeleton'
import { TechnicianDashboardSkeleton } from './pages/skeletons/TechnicianDashboardSkeleton'

// Lazy-loaded, one JS chunk per page: the skeleton fallbacks below only
// show while the browser is genuinely fetching that chunk (first visit to
// a route in a session; instant on repeat visits, since it's cached) —
// not a fabricated delay. Splitting also means Home doesn't ship Services'
// and Contact's code until they're actually visited.
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const ServicesPage = lazy(() => import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage })))
const ServiceDetailPage = lazy(() =>
  import('./pages/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })),
)
const BookingPage = lazy(() => import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })))
const ServiceTrackingPage = lazy(() =>
  import('./pages/ServiceTrackingPage').then((m) => ({ default: m.ServiceTrackingPage })),
)
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const TechnicianLoginPage = lazy(() =>
  import('./pages/TechnicianLoginPage').then((m) => ({ default: m.TechnicianLoginPage })),
)
const TechnicianDashboardPage = lazy(() =>
  import('./pages/TechnicianDashboardPage').then((m) => ({ default: m.TechnicianDashboardPage })),
)
const TechnicianJobsPage = lazy(() =>
  import('./pages/TechnicianJobsPage').then((m) => ({ default: m.TechnicianJobsPage })),
)
const TechnicianUpcomingJobsPage = lazy(() =>
  import('./pages/TechnicianUpcomingJobsPage').then((m) => ({ default: m.TechnicianUpcomingJobsPage })),
)
const TechnicianJobHistoryPage = lazy(() =>
  import('./pages/TechnicianJobHistoryPage').then((m) => ({ default: m.TechnicianJobHistoryPage })),
)
const TechnicianEarningsPage = lazy(() =>
  import('./pages/TechnicianEarningsPage').then((m) => ({ default: m.TechnicianEarningsPage })),
)
const TechnicianPerformancePage = lazy(() =>
  import('./pages/TechnicianPerformancePage').then((m) => ({ default: m.TechnicianPerformancePage })),
)
const TechnicianProfilePage = lazy(() =>
  import('./pages/TechnicianProfilePage').then((m) => ({ default: m.TechnicianProfilePage })),
)

// /technician/* routes other than Login get the technician portal's own
// app shell (TechnicianLayout, rendered inside each page) instead of the
// site's own Navbar/Footer/MobileBottomNav — see App() below, which reads
// this via useLocation() to decide whether to render that chrome at all.
// Login stays on the ordinary site layout (same as /login, /signup), same
// as before this dashboard existed.
function isTechnicianPortalRoute(pathname: string): boolean {
  return pathname.startsWith('/technician/') && pathname !== '/technician/login'
}

const MOBILE_MENU_ID = 'mobile-menu'

/** React Router doesn't reset scroll position between routes on its own —
 *  without this, navigating Home -> Contact would leave the viewport
 *  wherever it happened to be scrolled to on the previous page.
 *  `behavior: 'instant'` is deliberate — index.css now sets `scroll-
 *  behavior: smooth` globally (for anchor links), which `window.scrollTo`
 *  would otherwise inherit; smooth-scrolling while the page's content is
 *  also being swapped underneath it looks janky, not smooth. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  // The technician dashboard is its own app shell (TechnicianLayout,
  // rendered inside each /technician/* page below) with its own header and
  // sidebar navigation — the site's Navbar/Footer/MobileBottomNav/
  // MobileMenu would just be a second, conflicting navigation system
  // stacked on top of it. /technician/login stays on the ordinary site
  // layout (same as /login, /signup always have).
  const isTechnicianPortal = isTechnicianPortalRoute(location.pathname)

  function closeMenu() {
    setMenuOpen(false)
    // Return focus to the control that opened the menu.
    menuToggleRef.current?.focus()
  }

  return (
    <>
      <ScrollToTop />
      <PageTransitionSpinner />

      {/* Everything except the mobile menu itself lives here, so marking
          this inert while the menu is open can't also inert the menu. */}
      <div id="page-root" inert={menuOpen}>
        {!isTechnicianPortal && (
          <Navbar
            menuOpen={menuOpen}
            onOpenMenu={() => setMenuOpen(true)}
            menuToggleRef={menuToggleRef}
            menuId={MOBILE_MENU_ID}
          />
        )}
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<HomePageSkeleton />}>
                  <HomePage />
                </Suspense>
              }
            />
            <Route
              path="/services"
              element={
                <Suspense fallback={<ServicesPageSkeleton />}>
                  <ServicesPage />
                </Suspense>
              }
            />
            <Route
              path="/service/:serviceId"
              element={
                <Suspense fallback={<ServiceDetailPageSkeleton />}>
                  <ServiceDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/booking/:serviceId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<BookingPageSkeleton />}>
                    <BookingPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/track/:bookingId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<ServiceTrackingPageSkeleton />}>
                    <ServiceTrackingPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contact"
              element={
                <Suspense fallback={<ContactPageSkeleton />}>
                  <ContactPage />
                </Suspense>
              }
            />
            <Route
              path="/login"
              element={
                <Suspense fallback={<LoginPageSkeleton />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="/signup"
              element={
                <Suspense fallback={<SignupPageSkeleton />}>
                  <SignupPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardPageSkeleton />}>
                    <DashboardPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            {/* Technician portal — a completely separate login/dashboard
                pair from the customer routes above, gated by
                TechnicianProtectedRoute (TechnicianAuthContext), not
                ProtectedRoute (AuthContext). */}
            <Route
              path="/technician/login"
              element={
                <Suspense fallback={<LoginPageSkeleton />}>
                  <TechnicianLoginPage />
                </Suspense>
              }
            />
            <Route
              path="/technician/dashboard"
              element={
                <TechnicianProtectedRoute>
                  <Suspense fallback={<TechnicianDashboardSkeleton />}>
                    <TechnicianDashboardPage />
                  </Suspense>
                </TechnicianProtectedRoute>
              }
            />
            <Route
              path="/technician/jobs"
              element={
                <TechnicianProtectedRoute>
                  <Suspense fallback={<TechnicianDashboardSkeleton />}>
                    <TechnicianJobsPage />
                  </Suspense>
                </TechnicianProtectedRoute>
              }
            />
            <Route
              path="/technician/upcoming-jobs"
              element={
                <TechnicianProtectedRoute>
                  <Suspense fallback={<TechnicianDashboardSkeleton />}>
                    <TechnicianUpcomingJobsPage />
                  </Suspense>
                </TechnicianProtectedRoute>
              }
            />
            <Route
              path="/technician/job-history"
              element={
                <TechnicianProtectedRoute>
                  <Suspense fallback={<TechnicianDashboardSkeleton />}>
                    <TechnicianJobHistoryPage />
                  </Suspense>
                </TechnicianProtectedRoute>
              }
            />
            <Route
              path="/technician/earnings"
              element={
                <TechnicianProtectedRoute>
                  <Suspense fallback={<TechnicianDashboardSkeleton />}>
                    <TechnicianEarningsPage />
                  </Suspense>
                </TechnicianProtectedRoute>
              }
            />
            <Route
              path="/technician/performance"
              element={
                <TechnicianProtectedRoute>
                  <Suspense fallback={<TechnicianDashboardSkeleton />}>
                    <TechnicianPerformancePage />
                  </Suspense>
                </TechnicianProtectedRoute>
              }
            />
            <Route
              path="/technician/profile"
              element={
                <TechnicianProtectedRoute>
                  <Suspense fallback={<TechnicianDashboardSkeleton />}>
                    <TechnicianProfilePage />
                  </Suspense>
                </TechnicianProtectedRoute>
              }
            />
          </Routes>
        </main>

        {!isTechnicianPortal && (
          <>
            <Footer />
            <MobileBottomNav />
          </>
        )}
      </div>

      {!isTechnicianPortal && <MobileMenu id={MOBILE_MENU_ID} open={menuOpen} onClose={closeMenu} />}
    </>
  )
}

export default App
