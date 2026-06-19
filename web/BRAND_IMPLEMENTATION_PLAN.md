# Rasika Brand Implementation Plan

**Status:** Phase 1 (Design system tokens) ✅ Complete. Phase 2 (Component updates) — In Progress.

## Phase 1: Design System Tokens ✅

All design tokens have been implemented in `/app/globals.css`:
- ✅ Color palette (foundation, brand, dark theater, score tiers)
- ✅ Typography (3 font families, all scales)
- ✅ Spacing & layout (gaps, containers, sections)
- ✅ Radius, shadows, animations
- ✅ Utility classes for buttons, forms, cards, scores, avatars
- ✅ Design handoff files copied to `/design-handoff/`
- ✅ Comprehensive `BRAND_GUIDE.md` documentation

## Phase 2: Component Updates — Next Priority

### 2.1 ScoreCircle Component [HIGH PRIORITY]

**Current state:** Simple circular badge with orange border and text (`/app/components/ScoreCircle.js`)

**Required changes:**
- Replace `rounded-full` with `rounded-[28%]` (squircle)
- Implement score tier logic:
  - 0–49: `--score-not-for-me` (#8C8A93), white text
  - 50–69: `--score-worth-watch` (#C07A4E), white text
  - 70–89: `--score-loved` (#E6A437), dark ink text (#261E19)
  - 90–100: `--score-masterpiece` (#E14B33), white text
- Apply hover animation (lift + shadow) via `.score-hover` class
- Update font to Hanken 800
- Add `letter-spacing: -0.02em`

**Reference:**
```js
function scoreFill(v) {
  if (v >= 90) return '#E14B33';
  if (v >= 70) return '#E6A437';
  if (v >= 50) return '#C07A4E';
  return '#8C8A93';
}
function scoreText(v) { return (v >= 70 && v < 90) ? '#261E19' : '#FFFFFF'; }
```

**Suggested new implementation:**
```jsx
export default function ScoreCircle({ score, size = "md", showLabel = false }) {
  if (score === null || score === undefined) return null;

  const sizes = {
    sm: "w-8 h-8 text-[11px]",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const score_fill = (v) => {
    if (v >= 90) return '#E14B33';
    if (v >= 70) return '#E6A437';
    if (v >= 50) return '#C07A4E';
    return '#8C8A93';
  };
  
  const score_text = (v) => {
    return (v >= 70 && v < 90) ? '#261E19' : '#FFFFFF';
  };

  const fillColor = score_fill(score);
  const textColor = score_text(score);

  return (
    <div
      className={`${sizes[size]} rounded-[28%] flex items-center justify-center shrink-0 font-['Hanken_Grotesk'] font-800 transition-all duration-200 hover:shadow-card-hover hover:transform hover:-translate-y-1`}
      style={{
        backgroundColor: fillColor,
        color: textColor,
        letterSpacing: '-0.02em'
      }}
      title={showLabel ? labelFor(score) : ''}
    >
      {Math.round(score)}
    </div>
  );
}

function labelFor(v) {
  if (v >= 90) return 'A masterpiece';
  if (v >= 70) return 'Loved it';
  if (v >= 50) return 'Worth a watch';
  return 'Not for me';
}
```

### 2.2 MovieCard Component [HIGH PRIORITY]

**Current state:** Uses Stone colors (`rounded-xl`, `stone-200`, `stone-400`, `orange-500`, etc.)

**Required changes:**
1. Update poster container border-radius to match Rasika (16px = `--radius`)
2. Update title color from `stone-800` to `var(--ink)` 
3. Update secondary text color from `stone-400` to `var(--ink-mute)`
4. Update hover effects: title color on hover should become `var(--brand)` (already done)
5. Update action button colors to use `var(--brand)` and `var(--brand-soft)` on hover
6. Apply card-level styling with proper shadows
7. Replace emoji fallback with styled placeholder

**Key changes in className:**
- `rounded-xl` → `rounded-[var(--radius)]` (16px)
- `bg-stone-200` → `bg-slate-200` or appropriate neutral
- `text-stone-800` → `text-[var(--ink)]`
- `text-stone-400` → `text-[var(--ink-mute)]`
- `text-orange-600` → `text-[var(--brand)]`
- `text-orange-500` → `text-[var(--brand)]`
- Add `card` class to poster container for proper shadow

### 2.3 Navigation/Header Component [HIGH PRIORITY]

**Current state:** Likely using default Next.js styles or basic tailwind

**Required updates:**
1. Implement R-seal logo (`.r-seal` class)
2. Use cream colors on dark backgrounds if header is on dark theater
3. Brand color for primary CTA ("Join Rasika" or login button)
4. Typography: use `.text-label` for nav items
5. Proper spacing using `--gap-md`, `--gap-lg`

### 2.4 Onboarding Flow [MEDIUM PRIORITY]

**Current state:** Light stone/orange theme per memory

**Suggested approach:**
- Keep existing 2-step flow (language ranking → rate films) — this is solid
- Update colors: stone → paper/card backgrounds, orange → brand vermilion
- Use new typography scales
- Fix known bugs: language filter broken, batch 2 not adaptive to user selections
- Reference `Rasika Compare.dc.html` for the "vs" comparison mechanic if implementing taste ranking

### 2.5 Comparison Mechanic / Taste Builder [MEDIUM PRIORITY]

**Current state:** Exists at `/app/compare` but styling unknown

**Per brand spec (`Rasika Compare.dc.html`):**
- Two film/actor cards with "vs" token between
- User clicks a side → chosen gets `2px solid var(--brand)` border + lift + glow
- Other dims to `opacity: .42`
- "✓ Your pick" pill appears on winner
- Taste signal line (italic serif, brand color) appears: "Noted — you lean into..."
- Auto-advances after ~1.25s
- Secondary actions: "Loved both equally", "Haven't seen one", "Skip ▸"
- Top bar: "{N} compared" + fill bar + "{N×8, capped 99}% mapped"

### 2.6 Film Detail / Movie Page [LOWER PRIORITY]

**Updates if applicable:**
- Update typography to use serif fonts for film title/meta
- Use score badge for global + user match display
- Implement taste twins avatars row
- Use brand buttons for CTAs (rate, add to watchlist, etc.)

### 2.7 Other Components [LOWER PRIORITY]

- Rating modal
- Watchlist button
- Filter panel
- Leaderboards
- Community features
- All form inputs and modals

---

## Implementation Checklist

### Phase 2.1: Core Scoring & Cards
- [ ] Update `ScoreCircle.js` with squircle + tier colors
- [ ] Update `MovieCard.js` with Rasika colors and typography
- [ ] Verify hover states and shadows
- [ ] Test on multiple card sizes (sm, md, lg)

### Phase 2.2: Navigation & Layout
- [ ] Implement header/nav with R-seal logo
- [ ] Update footer with proper Rasika styling
- [ ] Ensure dark theater backgrounds + glows where appropriate
- [ ] Test section alternation (paper → sunk → dark)

### Phase 2.3: Onboarding
- [ ] Update onboarding colors and typography
- [ ] Fix language filter bug
- [ ] Make batch 2 adaptive to selections
- [ ] Add comparison/taste-builder if planned

### Phase 2.4: Testing & QA
- [ ] Visual regression testing (compare old → new)
- [ ] Dark mode (if app supports it)
- [ ] Mobile responsiveness
- [ ] Accessibility: contrast ratios, reduced-motion

---

## Utility Class Cheat Sheet

### Colors
```css
/* Use in style= or via Tailwind bg-[var(--color)] */
--paper, --card, --sunk, --line
--ink, --ink-soft, --ink-mute
--brand, --brand-deep, --brand-soft, --saffron
--surface-dark, --dark-card, --dark-border
--score-masterpiece, --score-loved, --score-worth-watch, --score-not-for-me
```

### Typography
```css
.text-display-xl  /* 86px hero */
.text-display-lg  /* 46px section heading */
.text-display-md  /* 34px tagline */
.text-serif-lg    /* 30px title */
.text-serif-md    /* 20px card title */
.text-ui-title    /* 17px UI heading */
.text-body        /* 16px body, soft color */
.text-body-lg     /* 18px body */
.text-kicker      /* 12px mono, brand color */
.text-label       /* 11px mono, muted */
.text-meta        /* 12px mono */
.text-tagline     /* italic serif, soft color */
```

### Components
```css
.btn-primary      /* Brand pill, white text, shadow */
.btn-secondary    /* Bordered pill */
.btn-ghost        /* Transparent, brand text */
.chip             /* Genre chip, toggles active */
.search-field     /* Pill input */
.tabs-nav / .tab  /* Tab navigation */
.score-badge      /* Squircle, 62px or 104px */
.score-ring       /* Percentage dial */
.card             /* Light card with shadow */
.card-dark        /* Dark card with deep shadow */
.r-seal           /* Logo square, 38px or 88px */
.wordmark         /* "Rasika." with brand bindu */
.lockup           /* R-seal + wordmark */
```

### Layout
```css
.container-landing    /* 1200px max-width */
.container-brand      /* 1180px max-width */
.section-lg / .section-md / .section-sm
.grid-2 / .grid-3 / .grid-4 / .grid-6  /* Responsive grids */
.flex-center          /* flex, centered */
.flex-between         /* flex, space-between */
.section-paper / .section-sunk / .section-dark  /* Alternating backgrounds */
```

### Animations
```css
.glow-pulse       /* 7–9s pulsing radial gradient */
.animate-fade-in  /* Quick entrance */
.animate-slide-up /* Sheet entrance */
/* Hover animations built into .btn-*, .card, .score-hover */
```

---

## Design Handoff Reference

Open these in a browser to see the intended look:
- `/design-handoff/Rasika Brand.dc.html` — System reference (colors, type, components)
- `/design-handoff/Rasika Landing v2.dc.html` — Hybrid landing page (dark hero + light sections)
- `/design-handoff/Rasika Compare.dc.html` — Taste-building comparison mechanic
- `/design-handoff/Rasika Vibrant.dc.html` — Energy explorations (dark vs. bright)

---

## Questions?

Refer to `/BRAND_GUIDE.md` for complete token specs, or see `globals.css` for the actual implementations.
