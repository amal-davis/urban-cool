import type { CSSProperties, ReactNode } from 'react'
import './Skeleton.css'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

/** One shimmering placeholder shape. Purely decorative — the surrounding
 *  SkeletonPage carries the actual "loading" announcement for screen
 *  readers, so this itself stays out of the accessibility tree. */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

interface SkeletonPageProps {
  /** Announced to screen readers as "Loading {label}…" — the only part of
   *  a skeleton screen that matters to someone who can't see the shimmer. */
  label: string
  children: ReactNode
}

/**
 * Wraps a page's skeleton composition with the accessibility layer real
 * content doesn't need: `role="status"` + `aria-busy` so assistive tech
 * knows this region is a loading placeholder, not real content, and a
 * visually-hidden text announcement (skeleton shapes convey nothing to a
 * screen reader on their own).
 */
export function SkeletonPage({ label, children }: SkeletonPageProps) {
  return (
    <div role="status" aria-busy="true">
      <span className="visually-hidden">Loading {label}…</span>
      {children}
    </div>
  )
}
