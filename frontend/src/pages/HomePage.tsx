import { HeroCarousel } from '../components/HeroCarousel/HeroCarousel'
import { BookServiceSection } from '../components/BookService/BookServiceSection'
import { MembershipBanner } from '../components/MembershipBanner/MembershipBanner'
import { WhyChooseUs } from '../components/WhyChooseUs/WhyChooseUs'
import { ServiceAvailability } from '../components/ServiceAvailability/ServiceAvailability'
import { HowItWorks } from '../components/HowItWorks/HowItWorks'
import { ServiceHighlights } from '../components/ServiceHighlights/ServiceHighlights'
import { FinalCTA } from '../components/FinalCTA/FinalCTA'
import { Reveal } from '../components/Reveal/Reveal'
import { usePageMeta } from '../lib/usePageMeta'

export function HomePage() {
  usePageMeta(
    'Urban Cool | Appliance Repair & Service Booking in Kochi',
    'Urban Cool — AC, refrigerator, washing machine, and microwave repair and service booking in Kochi, Kerala.',
  )

  return (
    <>
      {/* Not wrapped in Reveal: it's above the fold on every load, so
          useScrollReveal would just detect it's already visible and skip
          the animation anyway — no point paying for the observer setup. */}
      <HeroCarousel />
      <Reveal>
        <BookServiceSection />
      </Reveal>
      <Reveal>
        <ServiceHighlights />
      </Reveal>
      <Reveal>
        <MembershipBanner />
      </Reveal>
      <Reveal>
        <WhyChooseUs />
      </Reveal>
      <Reveal>
        <ServiceAvailability />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <FinalCTA />
      </Reveal>
    </>
  )
}
