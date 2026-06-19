# Rasika Brand Guide — Implementation v1.0

This document summarizes the Rasika brand design system as implemented in the web app. The source of truth is the design handoff files in `/web/app/globals.css`.

## Color Tokens

All colors are defined as CSS variables in `globals.css` and available throughout the app.

### Foundation (Warm, Not Neutral)
- `--paper: #FAF7F1` — Default page background
- `--card: #FFFFFF` — Card surfaces
- `--sunk: #F3EDE3` — Alternating section background
- `--line: #E7DFD3` — Borders, hairlines, dividers
- `--ink: #261E19` — Primary text (warm near-black)
- `--ink-soft: #6E635A` — Secondary text / body
- `--ink-mute: #9C9084` — Tertiary text, captions, mono labels

### Brand Colors
- `--brand: #E14B33` — Vermilion (THE brand color)
- `--brand-deep: #BE3B27` — Pressed/hover-deepened vermilion
- `--brand-soft: #FBE7E2` — Tinted vermilion background
- `--saffron: #E6A437` — "Loved it" score tier ONLY

### Dark Theater (Spotlight Surfaces)
- `--surface-dark: #17110D` — Dark theater background
- `--dark-card: #1F1711` — Cards on dark
- `--dark-border: #322519` — Dark card borders
- `--cream-light: #F7F0E4` — Headlines on dark
- `--cream-ui: #F4ECDE` — UI text on dark
- `--cream-body: #C3B6A2` — Body text on dark
- `--cream-nav: #B7A993` — Navigation on dark
- `--cream-caption: #8A7D6B` — Captions on dark

### Score Tiers
- `--score-masterpiece: #E14B33` (90–100)
- `--score-loved: #E6A437` (70–89)
- `--score-worth-watch: #C07A4E` (50–69)
- `--score-not-for-me: #8C8A93` (0–49)

## Typography

Three font families from Google Fonts:

### Instrument Serif (400 + italic)
*Display, wordmark, hero/section headlines, italic pull-quotes*
- H1: 86px (landing hero), 140px (masthead)
- H2: 46–52px (section heading)
- Card titles: 20–30px
- Tagline (italic): 24–34px

Classes:
- `.text-display-xl` — 86px hero
- `.text-display-lg` — 46px section heading
- `.text-display-md` — 34px tagline
- `.text-serif-lg` — 30px title
- `.text-serif-md` — 20px card title
- `.text-tagline` — italic serif body copy

### Hanken Grotesk (400/500/600/700/800)
*UI, body, buttons, score numbers*
- UI titles: 16–17px, weight 700
- Body: 16–19px, weight 400, line-height 1.6
- Score number: 16–46px, weight 800

Classes:
- `.text-ui-title` — 17px UI heading
- `.text-body` — 16px body copy
- `.text-body-lg` — 18px body copy

### JetBrains Mono (400/500/600)
*Labels, metadata, kickers, technical layer*
- Kicker/label: 11–12px, weight 500
- Meta: 12px

Classes:
- `.text-kicker` — 12px uppercase label (brand color)
- `.text-label` — 11px uppercase label (muted)
- `.text-meta` — 12px mono metadata

## Spacing & Layout

### Semantic Gaps
- `--gap-sm: 8px`
- `--gap-md: 12px`
- `--gap-lg: 24px` — Default grid gap
- `--gap-xl: 40px` — Two-column split gap
- `--gap-2xl: 60px` — Large section gap

### Containers
- Landing: max-width 1200px, padding 0 36px
- Brand sheet: max-width 1180px, padding 0 36px

### Section Spacing
- `.section-lg` — 96px vertical padding
- `.section-md` — 80px vertical padding
- `.section-sm` — 60px vertical padding

Alternate section backgrounds for rhythm: `--paper` → `--sunk` → `--paper` …, with `--surface-dark` for spotlight moments.

## Radius

- `--radius: 16px` — Default for cards, buttons
- `--radius-sharp: 4px` — Accent variant
- `--radius-pill: 999px` — Full pill (chips, nav buttons, search)
- `--score-radius: 28%` — Score squircle (global)
- `--avatar-radius: 22%` — R-seal, avatars

## Shadows

- `--shadow-card: 0 1px 3px rgba(0,0,0,.08)` — Card rest
- `--shadow-card-elevated: 0 18px 24px rgba(38,30,25,.10)` — Hover light
- `--shadow-card-hover: 0 24px 50px rgba(38,30,25,.16)` — Hover deep
- `--shadow-brand: 0 8px 20px rgba(225,75,51,.26)` — Brand button (light bg)
- `--shadow-brand-dark: 0 10px 30px rgba(225,75,51,.40)` — Brand button (dark bg)
- `--shadow-brand-glow: 0 0 22px rgba(225,75,51,.5)` — R-seal on dark
- `--shadow-dark-card: 0 30px 60px rgba(0,0,0,.55)` — Dark card

## Components

### Buttons
- `.btn-primary` — Vermilion pill, white text, shadow, lifts on hover
- `.btn-secondary` — Bordered pill, inverts on hover
- `.btn-ghost` — Transparent, brand color text, tints on hover

### Form Elements
- `.chip` — Genre chip (default light, active brand-soft)
- `.search-field` — Pill input with focus state
- `.tabs-nav` / `.tab` — Active tab has brand underline

### Score Display
- `.score-badge` — Squircle, 62px or 104px (xl)
- `.score-ring` — Percentage dial, 62px
- `.score-ring-inner` — White center well

Uses score tier colors and text based on value (0–49, 50–69, 70–89, 90–100).

### Taste Twins
- `.taste-twins` — Overlapping avatar flex
- `.taste-twins-avatar` — 34px circles, 2px white border, colors by tier
- `.taste-twins-overflow` — "+N" chip for remainder

### Logo & Mark
- `.r-seal` — 38px (default) or 88px (lg) vermilion square with rounded corners
- `.r-seal-letter` — White "R" in Instrument Serif
- `.wordmark` — "Rasika" in Instrument Serif, with brand-colored bindu (period)
- `.lockup` — R-seal + wordmark, 13px gap

## Animations

### Glow Pulse
```css
@keyframes glowpulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.08); }
}
.glow-pulse { animation: glowpulse 7s 9s ease-in-out infinite; }
```
Used on radial-gradient glow divs (vermilion top-right, saffron bottom-left) behind hero/CTA on dark theater backgrounds.

### Lift & Brighten
Buttons, cards, and interactive elements lift on hover:
```css
transition: all 0.25s ease;
&:hover { transform: translateY(-1px); filter: brightness(1.05); }
```

### Fade In
Quick entrance for modals, overlays:
```css
animation: fade-in 0.2s ease-out;
```

## Card Styles

### Light
- `.card` — white, `--line` border, soft shadow, lifts on hover

### Dark
- `.card-dark` — `--dark-card` bg, `--dark-border` border, deep shadow

## Grid Layouts

- `.grid-2` — 2-column, gap 40px (xl)
- `.grid-3` — 3-column, gap 24px (lg)
- `.grid-4` — 4-column, gap 24px (lg)
- `.grid-6` — 6-column, gap 24px (lg)

All collapse to 1 column on mobile (< 768px).

## Background Sections

- `.section-paper` — `--paper` (off-white)
- `.section-sunk` — `--sunk` (warm beige)
- `.section-dark` — `--surface-dark` (dark theater)

Alternate these for visual rhythm.

## Theater Hero

Theater backgrounds use layered radial gradients for a soft animated "spotlight" effect:

```html
<div class="bg-dark relative overflow-hidden">
  <div class="glow-vermilion" style="top: -100px; right: -100px;"></div>
  <div class="glow-saffron" style="bottom: -100px; left: -100px;"></div>
  <!-- content here -->
</div>
```

Glows can use `.glow-pulse` for slow animated pulsing (7–9s, infinite).

## Accessibility

The design respects `prefers-reduced-motion`. All animations are disabled for users who request reduced motion in their OS preferences.

## Score Logic Reference

```js
function scoreFill(v) {
  if (v >= 90) return '--score-masterpiece';
  if (v >= 70) return '--score-loved';
  if (v >= 50) return '--score-worth-watch';
  return '--score-not-for-me';
}

function scoreText(v) {
  return (v >= 70 && v < 90) ? '--ink' : 'white';
}

function scoreLabel(v) {
  if (v >= 90) return 'A masterpiece';
  if (v >= 70) return 'Loved it';
  if (v >= 50) return 'Worth a watch';
  return 'Not for me';
}
```

## Tone & Voice

- **Taste over information.** Answer "what should I watch?" not "what score?"
- **Ratings are personal.** Global + per-user match.
- **Warm, editorial, premium** with dramatic dark theater moments.
- **Playful but never cute.**
- **NO emoji anywhere.**
- **Never name competitors.** (No IMDb, Rotten Tomatoes refs in copy.)

---

For detailed visual references, see the `.dc.html` design files in the handoff package:
- `Rasika Brand.dc.html` — Full system reference
- `Rasika Landing v2.dc.html` — Hybrid landing (recommended home)
- `Rasika Compare.dc.html` — Comparison / taste-building mechanic
- `Rasika Vibrant.dc.html` — Energy explorations (reference)
