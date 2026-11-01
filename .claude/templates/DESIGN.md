<!--
  DESIGN.md — single source of truth for this project's visual identity.

  Format follows the Google Stitch DESIGN.md spec (open-source, alpha):
  https://github.com/google-labs-code/design.md

  Two parts:
  1. YAML front matter (between --- fences) — machine-readable design tokens.
     These are the *normative* values. AI coding agents read them directly to
     style new UI. Tokens use Stitch's `{path.to.token}` reference syntax.
  2. Markdown body — human-readable rationale and application guidance.
     Prose tells the *why*; tokens give the exact *what*.

  Canonical section order (omit any that don't apply, but don't reorder):
    1. Overview (Brand & Style)
    2. Colors
    3. Typography
    4. Layout (Layout & Spacing)
    5. Elevation & Depth
    6. Shapes
    7. Components
    8. Do's and Don'ts
  Extended sections that ATLAS adds beyond Stitch's canonical 8 (also optional):
    9. Iconography
    10. Tone & Voice
    11. Responsive Behavior
    12. Accessibility
    13. Open Gaps

  How to fill this in:
    - Run `/swe-atlas:create-design-md` to discover, prototype HTML variants,
      iterate with Boss, and auto-fill this file.
    - Or fill it manually if the design is already settled.
    - Replace every {{PLACEHOLDER}} below. Sections marked OPTIONAL can be
      removed entirely if not relevant.
-->

---
version: alpha
name: {{PROJECT_NAME}}
description: {{ONE_LINE_DESCRIPTION}}

colors:
  # Brand
  primary: "{{#HEX}}"
  on-primary: "{{#HEX}}"
  secondary: "{{#HEX}}"
  on-secondary: "{{#HEX}}"

  # Surfaces
  background: "{{#HEX}}"
  on-background: "{{#HEX}}"
  surface: "{{#HEX}}"
  on-surface: "{{#HEX}}"
  surface-container: "{{#HEX}}"
  surface-container-high: "{{#HEX}}"

  # Lines & low-emphasis
  outline: "{{#HEX}}"
  outline-variant: "{{#HEX}}"

  # Status
  success: "{{#HEX}}"
  on-success: "{{#HEX}}"
  warning: "{{#HEX}}"
  on-warning: "{{#HEX}}"
  error: "{{#HEX}}"
  on-error: "{{#HEX}}"
  info: "{{#HEX}}"
  on-info: "{{#HEX}}"

typography:
  display:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
  headline-md:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  title-lg:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  label-md:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.01em
  label-sm:
    fontFamily: {{FONT_FAMILY}}
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3

rounded:
  none: 0
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  gutter: 16px
  margin: 24px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  card:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input-field:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  badge:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
---

# DESIGN.md — {{PROJECT_NAME}}

> Single source of truth for this project's visual identity. AI coding agents read this file before generating any UI.

## Overview

{{2–4 sentences. What does this product feel like? Who is the audience? What emotional response should the UI evoke — playful or professional, dense or spacious, calm or energetic?}}

**Personality**: {{3 adjectives, e.g. "trustworthy, approachable, evidence-based"}}

**Audience**: {{primary user — concrete, e.g. "physicians using a 24/7 AI training tool"}}

**Style direction**: {{e.g. "Modern Corporate with a friendly twist", "Architectural Sharpness", "Liquid Glass", "Editorial Minimalism"}}

## Colors

{{2–4 sentences explaining the palette intent — what mood the colors carry, how the brand colors relate to each other.}}

- **Primary** (`{{#HEX}}`): {{when to use it}}
- **Secondary** (`{{#HEX}}`): {{when to use it}}
- **Surface** (`{{#HEX}}`): {{base canvas}}
- **On-surface** (`{{#HEX}}`): {{primary text on surface}}
- **Outline** (`{{#HEX}}`): {{borders, dividers}}

**Status colors** carry semantic meaning — never use them decoratively:

- **Success** (`{{#HEX}}`): confirmations, positive actions, "approved" states
- **Warning** (`{{#HEX}}`): caution, in-progress, attention-needed
- **Error** (`{{#HEX}}`): destructive actions, validation failures, failed states
- **Info** (`{{#HEX}}`): inline links, neutral notifications

## Typography

The system uses **{{FONT_FAMILY}}** for {{rationale — e.g. "exceptional legibility at small sizes and a contemporary, approachable feel"}}.

- **Display & headlines**: {{weight + intent}}
- **Body**: {{size + line-height rationale, especially for long-form readability}}
- **Labels**: {{used for buttons, metadata, chips — typically slightly heavier weight at small sizes}}

Two weights anchor the hierarchy: {{e.g. "Medium 500 for default text, Bold 700 for emphasis"}}. Reach for additional weights only when a specific component requires it.

## Layout

{{2–4 sentences describing the layout model — fluid grid vs. fixed-max-width, mobile-first vs. desktop-first, density philosophy.}}

- **Spacing scale**: 8px base unit (`{spacing.base}`); steps `xs 4`, `sm 8`, `md 16`, `lg 24`, `xl 40`, `2xl 64`. Use scale tokens before reaching for arbitrary values.
- **Rhythm**: vertical gap between unrelated sections defaults to `lg` or `xl`; gaps within a card or form group default to `sm` or `md`.
- **Containers**: {{e.g. "centered, max-width 1200px on desktop; full-width on mobile"}}.
- **App shell**: {{e.g. "fixed sidebar + fluid content area" / "top nav + scrollable canvas" / "no chrome — content fills viewport"}}.

## Elevation & Depth

{{Choose one philosophy and apply it consistently:}}

- **Tonal Layers** — surface tone shifts to imply depth (`surface` → `surface-container` → `surface-container-high`). Soft shadows for floating affordances only.
- **Ambient Shadows** — diffused shadows (blur 20–40px, opacity 4–8%) lift cards and modals. Avoid hard, dark drop-shadows.
- **Flat with Borders** — no shadows; visual hierarchy comes from `outline` borders and color contrast.

Describe the chosen approach in 2–3 sentences and how interactions (hover, active, focus) modulate elevation.

## Shapes

The shape language is **{{e.g. "softly rounded" / "architectural sharpness" / "fully circular"}}**.

- **Buttons**: `{rounded.md}` — feels {{intent}}
- **Cards & containers**: `{rounded.lg}` — slightly softer for grouped content
- **Inputs**: `{rounded.md}` — aligns with buttons
- **Pills, badges, avatars**: `{rounded.full}`
- **Hero / marketing surfaces**: `{rounded.xl}` or larger if the brand calls for a bold container shape

Mixing rounded and sharp corners on the same surface is a smell — pick one language per view.

## Components

### Buttons

- **Primary** — single most-important action per screen. Background `{colors.primary}`, text `{colors.on-primary}`, `{rounded.md}`, padding `{spacing.md}`. Hover swaps to `{colors.secondary}` background.
- **Secondary** — alternative actions (cancel, back). Background `{colors.surface}`, text `{colors.on-surface}`, `1px` outline using `{colors.outline}`.
- **Destructive** — delete, remove, irreversible actions. Background `{colors.error}`, text `{colors.on-error}`. Never use Primary teal/blue for destructive — color carries meaning.
- **Approve / positive** — Background `{colors.success}`, text `{colors.on-success}`.

### Cards

Background `{colors.surface-container}`, `{rounded.lg}`, padding `{spacing.lg}`. Use elevation per the chosen depth philosophy. Cards group related content; don't nest cards inside cards.

### Input fields

Background `{colors.surface-container}`, text `{colors.on-surface}`, `{rounded.md}`, padding `{spacing.md}`. Label sits above the field using `{typography.label-md}` in `{colors.on-surface}` (lower emphasis variant if available). Helper text below uses `{typography.label-sm}`. Error state colors the border `{colors.error}` and shows error text in `{colors.error}` below.

### Badges & chips

Background `{colors.surface-container-high}`, `{rounded.full}`, padding `{spacing.xs}`. Use status colors only for status-meaning badges (success, warning, error).

### Form layout

- Long forms: single column.
- Short pairs (first/last name, country/zip): 2-column.
- Long text areas: full-width.
- Primary action **right**, secondary action **left**, destructive lives on its own row or in a confirmation modal.
- Disable primary until required fields validate; show loading state on submit.

## Do's and Don'ts

- Do use the primary color **once per screen** for the single most-important action.
- Do maintain WCAG AA contrast (4.5:1 normal text, 3:1 large text) — verify on every brand-on-surface combination.
- Do let typography do the hierarchy work — weight + size before color.
- Do localize strings; don't hardcode width assumptions that break in JA/CJK or RTL.
- Don't mix outline and solid icons in the same context.
- Don't apply the brand gradient (if any) to body text or to multiple buttons on the same surface — gradient is a single moment.
- Don't introduce new colors outside this palette without updating DESIGN.md first.
- Don't use color alone to signal state — pair with icon, text, or shape.
- Don't celebrate routine actions (no confetti, no modal toasts) unless the product brief explicitly asks for it.

## Iconography

**Library**: {{e.g. "Lucide React" / "Heroicons (solid)" / "Material Symbols"}}.

| Size | Value | Use |
|---|---|---|
| Small | 16px | Inline with body text, badges |
| Default | 20px | Buttons, toolbars |
| Large | 24px | Toast, prominent affordances |
| Extra Large | 28–32px | Hero, marketing |

**Rules**:
- Icons support labels — they don't replace them. Buttons should have text + icon (icon left of text), not icon-only, except where the meaning is universally known (close `×`, search, settings).
- Use `currentColor` so icons inherit text color, except when the icon carries brand meaning (then use `{colors.primary}`).
- Stroke weight: stay consistent across the product (Lucide default `1.5`, Heroicons solid is filled).
- Status icons match status color (success-green check, error-red X, warning-orange triangle).

## Tone & Voice

- **Voice**: {{e.g. "Professional, clear, concise — suitable for a clinical context"}}.
- **Person**: {{2nd person ("you") for invitational copy / 1st person plural ("we") for assistant-like products}}.
- **Sentence case** for buttons, labels, tabs ("Sign in", not "SIGN IN" or "Sign In").
- **Helper text**: lowercase sentence, no period.
- **Error text**: imperative + corrective ("Please enter a valid email address" — tells the user what to do).
- **Avoid filler**: no "simply", "just", "please" where not required.
- {{If multilingual: list supported languages, default + fallback, and which strings stay English (e.g. brand product name).}}

## Responsive Behavior

### Breakpoints

| Name | Width | Notes |
|---|---|---|
| {{xs}} | < 640 | Compact, stacked |
| {{sm}} | 640–768 | Minor adjustments |
| {{md}} | 768–1024 | 2-column emerges |
| {{lg}} | 1024–1280 | Standard layout |
| {{xl}} | 1280–1536 | Expanded |
| {{2xl}} | ≥ 1536 | Capped content width |

### Collapsing strategy

- **Headlines**: scale down across breakpoints (e.g. display 48 → 36 → 28).
- **Multi-column** layouts collapse to single column at `md` or below.
- **Sidebars** become drawers on mobile; never two persistent panes below `lg`.
- **Hero illustrations** hide on `<md` and the form/CTA fills the viewport.
- **Tables** become card lists on mobile (or use horizontal scroll if data integrity requires fixed columns).

## Accessibility

- WCAG AA contrast on every text-on-surface pairing in the palette.
- Focus rings visible on every interactive element (`focus:outline` or equivalent), with sufficient contrast against both light and dark surfaces.
- All interactive elements keyboard reachable in source order.
- Form inputs with errors set `aria-invalid="true"` and have an error paragraph linked via `aria-describedby`.
- Toasts use `role="status"` + `aria-live="polite"`; modal dialogs trap focus and restore on close.
- Color is never the only signal — pair with icon, text label, or shape.
- Respect `prefers-reduced-motion` — disable parallax, autoplay, and large-distance transitions when set.
- Touch targets minimum 44×44 CSS pixels.

## Open Gaps

Track unresolved design questions and known divergences between this DESIGN.md and the current codebase. Each row should resolve over time (or be deleted).

| Gap | Canon | Current | Priority |
|---|---|---|---|
| {{example: theme tokens not yet wired into CSS variables}} | {{spec value}} | {{current implementation}} | {{High / Med / Low}} |

---

**Last updated**: {{YYYY-MM-DD}}
**How AI agents should read this**: tokens above are normative — use them verbatim. Prose is rationale — it answers "why" so judgment calls during implementation match the brand's intent. When prose and tokens disagree, tokens win.
