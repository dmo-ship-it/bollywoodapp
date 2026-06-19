# Rasika Brand Guidelines — Implementation Complete (Phase 1)

**Date:** 2026-06-19  
**Status:** ✅ Design system tokens fully integrated  
**Next:** Component updates (ScoreCircle, MovieCard, Navigation)

---

## What You've Received

Your brand guidelines package (`Rasika Website Branding.zip`) has been fully incorporated into your web app.

### 📦 Files Created

| File | Purpose |
|------|---------|
| **web/app/globals.css** | 706 lines of brand tokens, typography, components, animations — THE source of truth |
| **web/BRAND_GUIDE.md** | Complete reference: colors, typography, spacing, components, animations, tone/voice |
| **web/BRAND_IMPLEMENTATION_PLAN.md** | Roadmap for Phase 2 component updates with code examples |
| **design-handoff/** | Visual references (the original Claude Design `.dc.html` files) |

### 📚 Design Handoff Files

Located in `/web/design-handoff/` for reference:
- `Rasika Brand.dc.html` — Full system specs (open in browser)
- `Rasika Landing v2.dc.html` — Hybrid landing page example
- `Rasika Compare.dc.html` — Taste-building comparison flow
- `Rasika Vibrant.dc.html` — Energy direction explorations

---

## The Design System (Now Live in Your Code)

### Colors (CSS Variables)
All available as `var(--brand)`, `var(--paper)`, etc. in your stylesheets:

**Foundation:**
- `--paper` (#FAF7F1) — Off-white background
- `--card` (#FFFFFF) — Card surfaces
- `--sunk` (#F3EDE3) — Alternating section background
- `--ink` (#261E19) — Primary text
- `--ink-soft`, `--ink-mute` — Secondary/tertiary text

**Brand:**
- `--brand` (#E14B33) — Vermilion (THE brand color)
- `--brand-deep`, `--brand-soft` — Hover and tinted variants
- `--saffron` (#E6A437) — Reserved for "Loved it" (70–89) score tier

**Dark Theater:**
- `--surface-dark` (#17110D) — Spotlight backgrounds (hero, sign-up)
- `--dark-card`, `--dark-border` — Cards on dark
- `--cream-light`, `--cream-ui`, etc. — Text tones on dark

**Score Tiers:**
- `--score-masterpiece` (90–100, vermilion)
- `--score-loved` (70–89, saffron)
- `--score-worth-watch` (50–69, clay #C07A4E)
- `--score-not-for-me` (0–49, slate)

### Typography (Google Fonts)

Three typeface families, auto-loaded from Google Fonts:

1. **Instrument Serif** — Display, headers, wordmark, italic pull-quotes
   - `.text-display-xl` (86px hero), `.text-display-lg` (46px), `.text-serif-md` (20px)

2. **Hanken Grotesk** — UI, body, buttons, score numbers
   - `.text-ui-title` (17px, bold), `.text-body` (16px, warm gray)

3. **JetBrains Mono** — Labels, metadata, kickers, technical text
   - `.text-kicker` (12px, uppercase, brand color), `.text-label` (11px, muted)

### Utility Classes

Ready to use in JSX:

**Buttons:**
```jsx
<button className="btn-primary">Join Rasika</button>
<button className="btn-secondary">Learn More</button>
<button className="btn-ghost">Cancel</button>
```

**Components:**
```jsx
<div className="card">               {/* Light card, proper shadow */}
<div className="score-badge lg:w-20"> {/* Squircle, 62px default or 104px */}
<div className="r-seal">R</div>        {/* Logo tile, 38px or 88px */}
```

**Layout:**
```jsx
<section className="section-dark">     {/* Dark theater background */}
  <div className="container-brand">    {/* 1180px max, centered */}
    <div className="grid-3 gap-lg">    {/* 3-column responsive grid */}
```

**Text:**
```jsx
<h1 className="text-display-xl">...  {/* 86px serif */}
<p className="text-body">...           {/* 16px body, soft color */}
<span className="text-kicker">NEW</span> {/* 12px mono, brand */}
```

**Animations:**
```css
.glow-pulse                           {/* 7–9s pulsing glow */}
.animate-fade-in                      {/* Quick entrance */}
/* Hover animations built into buttons, cards, scores */
```

### Accessibility

All animations respect `prefers-reduced-motion: reduce` in OS settings.

---

## What's Next (Phase 2)

The design system is in place. Now update components to use it. **Start here:**

### 1. Update ScoreCircle (HIGH PRIORITY)
File: `/app/components/ScoreCircle.js`

**Change from:**
```jsx
className={`${sizes[size]} rounded-full border border-orange-200 bg-white ...`}
```

**Change to:**
- Use `border-radius: 28%` (squircle, not circle)
- Apply score tier colors based on value (0–49, 50–69, 70–89, 90–100)
- Use Hanken 800 font weight
- Apply hover animation (lift + shadow)

See `/web/BRAND_IMPLEMENTATION_PLAN.md` for the full suggested code.

### 2. Update MovieCard (HIGH PRIORITY)
File: `/app/components/MovieCard.js`

**Changes:**
- Color: `stone-*` → `var(--ink)`, `var(--ink-mute)`, etc.
- Typography: apply serif fonts for title where appropriate
- Border radius: `rounded-xl` → match `--radius` (16px)
- Shadows: use `--shadow-card` variables

### 3. Update Navigation/Header (HIGH PRIORITY)
Implement R-seal logo, cream colors on dark theater, brand buttons.

### 4. Update Onboarding (MEDIUM PRIORITY)
Fix language filter bug, make batch 2 adaptive, update colors/typography.

### 5. Implement Comparison Mechanic (MEDIUM PRIORITY)
See `Rasika Compare.dc.html` for the "vs" interaction pattern.

---

## How to Use This

### In CSS/Global Styles
```css
.my-component {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-serif);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}
```

### In Tailwind Classes (Next.js)
Tailwind v4 supports CSS variables directly:
```jsx
<div className="bg-[var(--paper)] text-[var(--ink)] rounded-[var(--radius)]">
```

### In Inline Styles (React)
```jsx
<div style={{ backgroundColor: 'var(--brand)', borderRadius: 'var(--avatar-radius)' }}>
```

---

## Key Design Principles (Per Brief)

- **Taste over information.** Answer "what should I watch?", not "what's the global score?"
- **Warm, editorial, premium** with dramatic dark "theater" moments.
- **Playful but never cute.** No emoji in UI.
- **Personal ratings matter.** Every film has a global score AND a per-user "match %".
- **Vermilion is THE voice.** One brand accent color; saffron reserved for top scores.
- **Dark theater for moments.** Hero, sign-up band, focal points — not entire layout.

---

## Files to Read First

1. **`web/BRAND_GUIDE.md`** — Color tokens, typography, components, all specs in one place
2. **`web/BRAND_IMPLEMENTATION_PLAN.md`** — Phase 2 roadmap with code examples for ScoreCircle, MovieCard
3. **`web/app/globals.css`** — The actual implementation (706 lines of tokens + utilities)
4. **`design-handoff/Rasika Brand.dc.html`** — Visual reference (open in browser)

---

## Questions?

Refer to the guides above, or check the design handoff files for exact visual specs. The system is built to be intuitive — if you see a color or animation in the design files, it's either:
1. A CSS variable in `globals.css` (e.g., `--brand`, `--glow-pulse`)
2. A utility class (e.g., `.btn-primary`, `.card`, `.text-display-xl`)
3. Documented in `BRAND_GUIDE.md`

**Happy building! 🎬**

---

## Checklist for Next Session

- [ ] Review `BRAND_GUIDE.md` and `BRAND_IMPLEMENTATION_PLAN.md`
- [ ] Update `ScoreCircle.js` with squircle + tier colors
- [ ] Update `MovieCard.js` with new colors and typography
- [ ] Update header/nav with R-seal logo
- [ ] Test on staging before merge
- [ ] Celebrate the refined brand! ✨
