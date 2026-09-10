import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

/**
 * Approximates the homepage's shape only through the first couple of
 * sections (hero + Book a Service cards) — the page has seven sections
 * total, but this only shows for as long as the route's JS chunk takes to
 * fetch (typically well under what it takes to scroll past the fold), so
 * matching every section pixel-for-pixel wouldn't add anything a user
 * would actually see.
 */
export function HomePageSkeleton() {
  return (
    <SkeletonPage label="Urban Cool homepage">
      <section className="skeleton-section">
        <div className="container">
          <Skeleton className="skeleton-hero" />
        </div>
      </section>

      <section className="skeleton-section">
        <div className="container">
          <Skeleton className="skeleton-heading skeleton-heading--center" />
          <div className="skeleton-card-grid skeleton-card-grid--4up">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="skeleton-card" />
            ))}
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
