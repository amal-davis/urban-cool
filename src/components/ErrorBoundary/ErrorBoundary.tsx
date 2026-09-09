import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** Shown instead of `children` once something inside has thrown during
   *  render — a plain node, not a render-prop, so a caller can't
   *  accidentally re-trigger the same failing render from inside it. */
  fallback: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Generic, reusable render-error boundary — class-based because
 * `getDerivedStateFromError`/`componentDidCatch` have no hook equivalent in
 * stable React. Catches a throw anywhere in `children`'s render and shows
 * `fallback` in its place instead of letting the crash propagate up and
 * blank the entire page (React unmounts the whole tree above the nearest
 * boundary otherwise).
 *
 * This is a safety net, not a fix — it only ever masks a symptom, so pair
 * it with the actual crash's root cause being fixed, not instead of that.
 * It also doesn't self-heal: a subtree that starts throwing stays on
 * `fallback` until the boundary itself remounts (a route change, or the
 * user reloading), which is the safe default for something this generic
 * rather than silently retrying a render that may just fail again.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never swallowed silently — still shows up in the console/error
    // reporting exactly like an uncaught render error normally would.
    console.error('ErrorBoundary caught a render error:', error, info.componentStack)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
