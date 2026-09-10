# Product

## Register

product

## Users

Two distinct user groups:

- **Customers**: homeowners/renters who need AC, refrigerator, washing machine, or microwave repair. They arrive stressed (something broken, often urgently — e.g. an AC out in summer heat) and want to book a trustworthy technician fast, with a clear price and time expectation. Desktop and mobile usage are treated as equally important.
- **Technicians/ops**: staff who get services assigned to them and need to see, accept, and track job details efficiently. Secondary surface for now — the customer booking flow is the primary design lens.

## Product Purpose

A service-booking platform for home appliance repair: customers select a service category (AC, fridge, washing machine, microwave), describe the issue, and book a technician. On the ops side, technicians get assigned to incoming bookings and track jobs through to completion. Success = a customer can go from "my AC is broken" to "a technician is booked" in as few steps as possible, with confidence about who's coming and when.

## Brand Personality

**Fast & efficient.** The interface should feel snappy and get-it-done — booking takes seconds, not minutes. No fluff, no filler copy, no unnecessary steps between "I have a problem" and "it's booked." Confidence comes from clarity and speed, not from heavy trust-badge decoration.

No specific reference site to emulate or avoid; design should stand on its own rather than read as a copy of an existing home-services app.

## Anti-references

Avoid the cluttered, dated look common to Indian service-directory sites and apps: stacked promotional banners, dense walls of text, mismatched card grids, visual noise competing for attention. Also avoid generic cookie-cutter SaaS templates. The bar is clean, fast, and confident — not busy.

## Design Principles

1. **Fewest steps to booked.** Every screen in the booking flow should reduce friction, not add it — minimize form fields, decisions, and page loads between problem and confirmed booking.
2. **Clarity over decoration.** Service category, price, and technician ETA should be immediately scannable. No ambiguity about what happens next.
3. **Speed is the brand.** Motion, loading states, and copy should all reinforce "fast" — quick transitions, no artificial delays, terse confident copy.
4. **Calm under stress.** Customers often arrive with a broken appliance and some urgency; the design should feel reassuring and in-control, not chaotic, even while being fast.
5. **One flow, two audiences.** The booking experience is the priority surface; the technician/ops experience should stay efficient and legible but not compete for design attention yet.

## Accessibility & Inclusion

WCAG AA baseline: minimum 4.5:1 text contrast (3:1 for large text), full keyboard navigation, visible focus states, and a `prefers-reduced-motion` alternative for every animation. Household audience skews toward general and older users — avoid relying on color alone to convey status (e.g. booking state, technician assignment), and keep interactive targets comfortably tappable (≥44px).
