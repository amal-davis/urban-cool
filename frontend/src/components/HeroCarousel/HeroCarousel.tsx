import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
// `setupJquery` must be imported before the Owl Carousel script — Owl reads
// `window.jQuery` directly at import time, and jQuery's ESM build doesn't
// set that global on its own. See setupJquery.ts for why the global
// assignment has to live in its own module rather than inline here.
import $ from '../../lib/setupJquery'
import 'owl.carousel/dist/owl.carousel.js'
import 'owl.carousel/dist/assets/owl.carousel.css'

import { heroSlides } from '../../data/heroSlides'
import './HeroCarousel.css'

// Identical on every slide — brand tagline and trust marks, not tied to
// which service is currently showing (unlike heroSlides.ts's per-slide
// heading/description/CTA). Built once and reused per slide below rather
// than repeated inline in the loop.
const HERO_EYEBROW = 'Cooler Homes, Happier Tomorrows'

// Same base attrs/paths as Icons.tsx's ShieldCheckIcon/ClockIcon, hand-
// written as literal SVG strings — this carousel builds its DOM with plain
// APIs, not JSX (see the file-level comment below), so those components
// can't be rendered directly here. Keep in sync with Icons.tsx if either
// glyph ever changes.
const HERO_TRUST_ITEMS: { label: string; iconSvg: string }[] = [
  {
    label: 'Trusted Experts',
    iconSvg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.5 7 8.5 4.1-1 7-4.3 7-8.5V6l-7-2.5z" /><path d="M9 12.25l2 2 4-4.25" /></svg>',
  },
  {
    label: 'On-Time Service',
    iconSvg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.25" /><path d="M12 7.5V12l3.25 2" /></svg>',
  },
]

/**
 * Why this is built imperatively instead of as JSX children:
 *
 * Owl Carousel (jQuery) wraps each direct child of its container in
 * `.owl-item`/`.owl-stage` markup on init, and unwraps it on destroy. If
 * React also owned that subtree, its own reconciliation would fight the
 * plugin's DOM edits — the classic React+jQuery-plugin crash. Instead, React
 * owns only the empty `<div ref={trackRef}>` shell; everything inside it is
 * built and torn down with plain DOM APIs in the effect below, so React
 * never re-renders into territory the plugin is mutating.
 */
export function HeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  // Mirrors `navigate` for the mount-only effect below, so that effect can
  // stay a true mount/unmount pair ([] deps — the imperative Owl Carousel
  // setup must only run once) without the linter reading it as a stale
  // closure — same ref-mirrors-latest-value approach as Toast.tsx/
  // LocationPicker.tsx elsewhere in this project. `navigate` itself is
  // already stable across renders (react-router guarantees this); the ref
  // is here to satisfy the lint rule honestly rather than suppress it.
  const navigateRef = useRef(navigate)
  useEffect(() => {
    navigateRef.current = navigate
  })

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Build slide markup — full-bleed background photo behind a scrim, with
    // the eyebrow/heading/description/CTA/trust row overlaid on top (see
    // data/heroSlides.ts for what's per-slide vs. HERO_EYEBROW/HERO_TRUST_
    // ITEMS below for what's identical on every slide).
    for (const slide of heroSlides) {
      const item = document.createElement('div')
      item.className = 'hero-slide'

      const bg = document.createElement('img')
      bg.className = 'hero-slide__bg'
      bg.src = slide.image
      bg.alt = slide.imageAlt
      bg.loading = 'lazy'
      if (slide.imagePosition) bg.style.objectPosition = slide.imagePosition

      const scrim = document.createElement('div')
      scrim.className = 'hero-slide__scrim'
      scrim.setAttribute('aria-hidden', 'true')

      const content = document.createElement('div')
      content.className = 'hero-slide__content'

      const eyebrow = document.createElement('p')
      eyebrow.className = 'hero-slide__eyebrow'
      eyebrow.textContent = HERO_EYEBROW

      const heading = document.createElement('h2')
      heading.className = 'hero-slide__heading'
      const headingLine1 = document.createElement('span')
      headingLine1.className = 'hero-slide__heading-line'
      headingLine1.textContent = slide.headingLine1
      const headingLine2 = document.createElement('span')
      headingLine2.className = 'hero-slide__heading-line hero-slide__heading-line--accent'
      headingLine2.textContent = slide.headingLine2
      heading.append(headingLine1, headingLine2)

      const description = document.createElement('p')
      description.className = 'hero-slide__description'
      description.textContent = slide.description

      const cta = document.createElement('button')
      cta.type = 'button'
      cta.className = 'btn btn--accent hero-slide__cta'
      cta.setAttribute('aria-label', slide.ctaAriaLabel)
      // Same path Icons.tsx's ChevronRightIcon draws — this carousel is
      // built with plain DOM APIs, not JSX (see the file-level comment on
      // why), so the icon vocabulary is reproduced as a literal SVG string
      // here rather than rendered as that component. slide.ctaLabel is
      // static copy from data/heroSlides.ts, never user input, so this
      // isn't an XSS concern the way innerHTML-from-arbitrary-input would be.
      cta.innerHTML = `<span>${slide.ctaLabel}</span><svg class="hero-slide__cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>`
      // Real navigation — /booking/:serviceId already exists (BookingPage),
      // and `slide.id` already matches services.ts's Service.id, the same
      // id space every other "Book Now" control in the app uses.
      cta.addEventListener('click', () => navigateRef.current(`/booking/${slide.id}`))

      const trust = document.createElement('div')
      trust.className = 'hero-slide__trust'
      HERO_TRUST_ITEMS.forEach(({ label, iconSvg }, index) => {
        if (index > 0) {
          const divider = document.createElement('span')
          divider.className = 'hero-trust-divider'
          divider.setAttribute('aria-hidden', 'true')
          trust.append(divider)
        }
        const trustItem = document.createElement('span')
        trustItem.className = 'hero-trust-item'
        trustItem.innerHTML = `${iconSvg}<span>${label}</span>`
        trust.append(trustItem)
      })

      content.append(eyebrow, heading, description, cta, trust)

      item.append(bg, scrim, content)
      track.append(item)
    }

    const $track = $(track)

    function labelControls() {
      $track.find('.owl-dot').each(function (this: HTMLElement, index: number) {
        $(this).attr('aria-label', `Go to slide ${index + 1} of ${heroSlides.length}`)
      })
    }

    // Owl leaves inactive/cloned slides fully focusable even though they're
    // clipped offscreen — a real keyboard trap. `inert` removes them from
    // both the tab order and the accessibility tree in one step.
    function syncInertItems() {
      // Non-null: guarded by the early return above; TS doesn't carry that
      // narrowing into a function declared later in the same closure.
      track!.querySelectorAll<HTMLElement>('.owl-item').forEach((el) => {
        el.inert = el.classList.contains('cloned') || !el.classList.contains('active')
      })
    }

    function announceSlide(index: number) {
      const slide = heroSlides[index % heroSlides.length]
      if (liveRegionRef.current && slide) {
        liveRegionRef.current.textContent =
          `Slide ${index + 1} of ${heroSlides.length}: ${slide.headingLine1} ${slide.headingLine2}`
      }
    }

    $track.owlCarousel({
      items: 1,
      loop: true,
      autoplay: !prefersReducedMotion,
      autoplayTimeout: 6000,
      autoplayHoverPause: true,
      smartSpeed: 600,
      nav: false,
      dots: true,
      responsive: { 0: { items: 1 }, 768: { items: 1 }, 1024: { items: 1 } },
    })

    labelControls()
    syncInertItems()

    // `owlCarousel()` calls always return the jQuery collection, even for
    // string-method calls — the only way to read a value back (like the
    // settled index below) is through the plugin's own instance, which it
    // stores on the element's jQuery data.
    const owlInstance = $track.data('owl.carousel') as
      | { relative: (position: number) => number; current: () => number }
      | undefined

    // `translated` fires once the slide animation has fully settled — unlike
    // `changed` (which fires at the *start* of a transition, before Owl's own
    // `.active` class reassignment has necessarily run), so reading DOM state
    // or the instance's current position here is safe from that race.
    $track.on('translated.owl.carousel', () => {
      syncInertItems()
      if (owlInstance) announceSlide(owlInstance.relative(owlInstance.current()))
    })

    // Pause autoplay while any control/CTA inside the carousel has keyboard
    // focus — hover-pause alone leaves keyboard users without a way to stop
    // an auto-advancing slide (WCAG 2.2.2).
    function pauseForFocus() {
      $track.trigger('stop.owl.autoplay')
    }
    function resumeAfterFocus() {
      if (!prefersReducedMotion) $track.trigger('play.owl.autoplay')
    }
    track.addEventListener('focusin', pauseForFocus)
    track.addEventListener('focusout', resumeAfterFocus)

    return () => {
      track.removeEventListener('focusin', pauseForFocus)
      track.removeEventListener('focusout', resumeAfterFocus)
      $track.off('.owl.carousel')
      $track.owlCarousel('destroy')
      track.innerHTML = ''
    }
  }, [])

  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container">
        <h1 id="hero-heading" className="visually-hidden">
          Urban Cool — book AC, refrigerator, washing machine &amp; microwave repair
        </h1>
        <div className="owl-carousel hero-carousel__track" ref={trackRef} />
        <div className="visually-hidden" role="status" aria-live="polite" ref={liveRegionRef} />
      </div>
    </section>
  )
}
