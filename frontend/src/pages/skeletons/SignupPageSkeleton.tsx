import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

// Mirrors LoginPageSkeleton — same centered-card shape (PageSkeletons.css's
// .skeleton-auth-wrap/.skeleton-auth-card), since both auth pages share one
// page shell. The real page settles into whichever of the three signup
// steps is current once its chunk loads; this only needs to approximate
// "a card is coming," same as Login's skeleton does today.
export function SignupPageSkeleton() {
  return (
    <SkeletonPage label="Urban Cool signup page">
      <section className="skeleton-section">
        <div className="container skeleton-auth-wrap">
          <div className="skeleton-auth-card">
            <Skeleton className="skeleton-heading skeleton-heading--center" />
            <Skeleton className="skeleton-text skeleton-heading--center" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-button skeleton-button--block" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
