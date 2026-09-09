import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

/** Shared Suspense fallback for every /technician/* dashboard route (see
 *  App.tsx) — generic enough (a header bar + a stat row + a couple of card
 *  rows) to stand in for any of them equally well, rather than one skeleton
 *  per page for what's only ever a brief first-chunk-load flash. */
export function TechnicianDashboardSkeleton() {
  return (
    <SkeletonPage label="technician dashboard">
      <div className="skeleton-tech-dashboard">
        <Skeleton className="skeleton-tech-dashboard__header" />
        <div className="skeleton-tech-dashboard__stats">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="skeleton-tech-dashboard__stat" />
          ))}
        </div>
        <Skeleton className="skeleton-tech-dashboard__card" />
        <Skeleton className="skeleton-tech-dashboard__card" />
      </div>
    </SkeletonPage>
  )
}
