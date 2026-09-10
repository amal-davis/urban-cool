<!-- SEED: re-run /impeccable document once there's code, to capture the real rendered tokens and components. Colors and typography below are already committed decisions (real brand hex, chosen font direction) — this is a seed only in that no components exist yet to extract. -->

---
name: urban-cool
description: Fast, no-nonsense home appliance repair booking — AC, fridge, washing machine, microwave.
colors:
  primary: "#0186dc"
  primary-deep: "#0059ae"
  accent: "#bf052e"
  accent-deep: "#930012"
  bg: "#ffffff"
  surface: "#f1f6fa"
  ink: "#090e13"
  muted: "#606468"
  border: "#dbdee2"
  success: "#308639"
  warning: "#f5ae39"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1rem + 4vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  3xl: "96px"
---

# Design System: urban-cool

## 1. Overview

**Creative North Star: "The Dispatch Board"**

urban-cool exists to close the gap between "my AC just died" and "a technician is booked" in as few taps as possible. Every visual decision serves that: strong structural blue for orientation and trust, a reserved red for the one action that matters most (Book Now), flat surfaces, no decoration competing for attention. The mood is a dispatcher's board, not a storefront window — legible at a glance, fast to act on, calm even when the customer arrived stressed.

This system explicitly rejects the cluttered, dated look common to Indian service-directory sites and apps — stacked promotional banners, dense walls of text, mismatched card grids, visual noise competing for attention — and rejects generic cookie-cutter SaaS templates. Confidence here comes from clarity and speed, not trust-badge decoration.

**Key Characteristics:**
- Pure white ground, no warm-tinted "safe" neutrals — the brand's warmth lives in copy and color, not in the background.
- Two committed brand colors, each with one job: blue for structure and identity, red held in reserve for urgency.
- One typeface, geometric and technical, carrying the entire hierarchy through weight and size alone.
- Flat by default; depth is functional (modals, dropdowns), never decorative.

## 2. Colors

Two committed brand colors on a pure-white ground — a "Committed" strategy, not restrained: blue is structural and everywhere, red is rare and load-bearing.

### Primary
- **Signal Blue** (#0186dc / oklch(0.605 0.161 247.7)): the brand's default voice — navigation, primary buttons, active states, links, section headers. This is what "urban-cool" looks like at rest.
- **Signal Blue Deep** (#0059ae / oklch(0.46 0.165 247.7)): hover/active/pressed state for any Signal Blue fill. Also the safer fill choice for a filled surface carrying button text smaller than 14px semibold (see Typography contrast note below).

### Secondary
- **Dispatch Red** (#bf052e / oklch(0.510 0.203 21.0)): reserved for the single highest-priority action on a screen — "Book Now," "Confirm Booking," cancellation, and error/alert states. Its rarity is what gives it urgency; the moment it appears twice on one screen for two different things, it stops meaning "act now."
- **Dispatch Red Deep** (#930012 / oklch(0.40 0.19 21.0)): hover/active/pressed state for any Dispatch Red fill.

### Neutral
- **Paper** (#ffffff): the ground. Pure white, no warm or cool tint — the brand color does the emotional work, not the background.
- **Panel** (#f1f6fa / oklch(0.97 0.008 247.7)): cards, input fields, table row stripes, section breaks — a whisper of Signal Blue's hue, just enough to separate a panel from the page without a shadow.
- **Ink** (#090e13 / oklch(0.16 0.014 247.7)): body text and headings. 19.4:1 against Paper — no washed-out gray-on-white here.
- **Muted** (#606468 / oklch(0.50 0.008 247.7)): secondary text, captions, timestamps, technician ETAs. Still 5.99:1 against Paper — legible, not decorative-light-gray.
- **Line** (#dbdee2 / oklch(0.90 0.006 247.7)): borders, dividers, input outlines.

### Status
- **Confirmed Green** (#308639 / oklch(0.55 0.14 145)): booking confirmed / technician assigned / job complete.
- **Pending Amber** (#f5ae39 / oklch(0.80 0.15 75)): booking pending / technician en route. Pair with Ink text, not white — Amber sits too light for white text to hold.

### Named Rules
**The Two-Signal Rule.** Blue carries structure and identity; red is spent on exactly one action per screen. Never place a Blue fill and a Red fill as equal-weight, same-size blocks side by side — their luminance sits close enough (relative contrast ≈1.7) that adjacent equal blocks read muddy rather than distinct. Separate them by role (blue = where you are, red = what to do right now), not by proximity.

**The No-Gray-Status Rule.** Booking status (confirmed / pending / cancelled) is never color-only. Every status pill pairs its color with a label and, where space allows, an icon — colorblind users and anyone glancing at a low-brightness phone screen still need to read the state.

## 3. Typography

**Display Font:** Plus Jakarta Sans (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Plus Jakarta Sans (same family, carried by weight and size, not a second face)

**Character:** Geometric and technical without being cold — Plus Jakarta Sans holds its shape at small UI sizes (form labels, status pills) as well as it does at headline scale, which is the whole point of a one-family system for a fast booking flow.

### Hierarchy
- **Display** (700, clamp(2.25rem, 1rem + 4vw, 3.5rem), 1.05 line-height, -0.02em): page-level headlines only — "Book a repair in under a minute." Used once per screen, if at all.
- **Headline** (600, 1.75rem, 1.15): section headers — "Select a service," "Your booking."
- **Title** (600, 1.125rem, 1.3): card titles, form section labels — service name, technician name.
- **Body** (400, 1rem, 1.5, cap 70ch): descriptions, confirmations, help text. This is the workhorse size for the booking flow itself.
- **Label** (600, 0.8125rem, 1.3, 0.02em tracking): form field labels, timestamps, status pill text. Uppercase only for status pills (CONFIRMED / PENDING); never uppercase for anything a user reads as a sentence.

### Named Rules
**The One-Family Rule.** Plus Jakarta Sans, full stop. Hierarchy comes from weight (400/600/700) and size, never from introducing a second typeface for "contrast."

**The Large-Text Contrast Note.** White text on Signal Blue hits 3.85:1 — enough only for WCAG's actual large-text threshold (≥18.66px/14pt bold, or ≥24px/18pt regular), which button and label text almost never meets. In practice: **default every solid-fill Signal Blue button, badge, or piece of UI chrome to Signal Blue Deep** (6.91:1, safe at any size), and reserve plain Signal Blue for large decorative surfaces, illustration strokes, and other non-text or genuinely-large uses. Dispatch Red clears 6.41:1 with white text at any size, so it doesn't need the same swap — its Deep variant is for hover/active states only, not a contrast requirement.

## 4. Elevation

Flat by default. Depth between page and panel comes from the Paper/Panel color step, not shadow — matches the "responsive, not choreographed" motion energy: fast interfaces don't need simulated depth to feel real. Shadow is reserved strictly for layers that visually float above the page content: modals, dropdowns, toasts.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 8px 24px rgba(9, 14, 19, 0.12)`): modals, dropdown menus, the booking-confirmation sheet, toasts. Never applied to a resting card.

### Named Rules
**The Flat-by-Default Rule.** If it isn't floating above other content, it doesn't get a shadow. A resting service card or booking-status card is separated from Paper by the Panel color step and a 1px Line border — never a shadow "for polish."

## 5. Do's and Don'ts

### Do:
- **Do** keep Paper pure white (#ffffff) — no warm or cream tint. The brand's warmth is Signal Blue + Dispatch Red + copy, not the background.
- **Do** hold Dispatch Red to one action per screen. Its scarcity is what makes "Book Now" read as urgent.
- **Do** pair every status indicator (confirmed/pending/cancelled) with text or an icon, never color alone.
- **Do** keep interactive targets ≥44px and every focus state visible — the audience skews toward general and older users booking under some stress.
- **Do** give every animation a `prefers-reduced-motion` fallback (instant or crossfade) — non-negotiable per PRODUCT.md's accessibility baseline.
- **Do** use Signal Blue Deep instead of Signal Blue for any small/regular-weight text-on-fill moment (see the Large-Text Contrast Note).
- **Do** use `spacing.2xl`/`3xl` (64/96px) for vertical rhythm *between* full page sections, and cap at `spacing.xl` (40px) for padding *inside* a component (card, panel, button group). Conflating the two is what makes a page of sections feel cramped instead of premium.

### Don't:
- **Don't** stack promotional banners, dense text walls, or mismatched card-grid sizes — the cluttered, dated Indian-service-directory look this system explicitly rejects.
- **Don't** default to a generic cream/beige "SaaS template" background or an icon-grid-of-identical-cards layout.
- **Don't** place a Blue fill and a Red fill as adjacent same-size blocks (see The Two-Signal Rule) — their contrast is too close to read as distinct at that proximity.
- **Don't** use `border-left`/`border-right` colored stripes as a callout or status accent — use the Panel/Line color step or a status pill instead.
- **Don't** apply a shadow to a resting card "for depth" — shadows are reserved for floating layers only (see The Flat-by-Default Rule).
- **Don't** introduce a second typeface. Hierarchy is weight and size within Plus Jakarta Sans only.
