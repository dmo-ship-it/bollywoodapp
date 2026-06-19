# Rasika Brand — Quick Start Guide

**Your complete design system is now built and ready to use.** Here's where everything lives and how to use it.

---

## 📁 File Structure

```
bollywood-app/
├── web/
│   ├── app/
│   │   ├── globals.css              ← 🎨 THE SYSTEM (706 lines of tokens + utilities)
│   │   ├── components/
│   │   │   ├── ScoreCircle.js       ← TODO: Update to squircle + tier colors
│   │   │   ├── MovieCard.js         ← TODO: Update colors/typography
│   │   │   └── ...
│   │   └── ...
│   ├── design-handoff/              ← 📚 Visual reference files (open in browser)
│   │   ├── Rasika Brand.dc.html     ← System specs (colors, type, components)
│   │   ├── Rasika Landing v2.dc.html
│   │   ├── Rasika Compare.dc.html
│   │   └── Rasika Vibrant.dc.html
│   ├── BRAND_GUIDE.md               ← 📖 Complete token reference
│   ├── BRAND_IMPLEMENTATION_PLAN.md ← 🛣️ Phase 2 roadmap with code examples
│   └── package.json
├── BRAND_UPDATE_SUMMARY.md          ← 📝 What was done, what's next
└── RASIKA_BRAND_QUICK_START.md      ← 👈 You are here
```

---

## 🎯 What's Ready Right Now

### CSS Variables
Use in any style:
```css
background: var(--paper);
color: var(--ink);
border-color: var(--line);
```

All available: `--paper`, `--card`, `--sunk`, `--line`, `--ink`, `--ink-soft`, `--ink-mute`, `--brand`, `--brand-deep`, `--brand-soft`, `--saffron`, `--surface-dark`, `--dark-card`, `--score-masterpiece`, etc.

### Utility Classes
Use in JSX:
```jsx
<button className="btn-primary">Click me</button>
<div className="card">Content</div>
<h1 className="text-display-lg">Heading</h1>
<div className="score-badge">85</div>
<div className="section-dark">Dark theater</div>
```

### Typography (Google Fonts)
Auto-loaded. Use in classes or inline:
```jsx
<h1 style={{ fontFamily: 'var(--font-serif)' }}>Title</h1>
<p className="text-body">Regular body text</p>
```

---

## 🚀 Start Here

### 1. Familiarize Yourself
Read in this order:
1. **This file** (2 min) — Overview
2. **`BRAND_UPDATE_SUMMARY.md`** (10 min) — What was done + next steps
3. **`BRAND_GUIDE.md`** (15 min) — Complete reference

### 2. See the Design
Open these in a browser (they're interactive):
```
web/design-handoff/Rasika Brand.dc.html          ← System reference
web/design-handoff/Rasika Landing v2.dc.html     ← Example landing
web/design-handoff/Rasika Compare.dc.html        ← Comparison mechanic
```

### 3. Update Components (Phase 2)
Start with high-priority components:

**ScoreCircle.js** — Most visible, quickest win
```
web/app/components/ScoreCircle.js
→ See BRAND_IMPLEMENTATION_PLAN.md for exact code
```

**MovieCard.js** — Update colors/typography
```
web/app/components/MovieCard.js
→ Change stone-* to var(--ink), var(--ink-mute), etc.
```

---

## 🎨 The Color Palette (Quick Reference)

| Use | CSS Variable | Hex | Notes |
|-----|---|---|---|
| Page background | `--paper` | #FAF7F1 | Warm off-white |
| Card surfaces | `--card` | #FFFFFF | White |
| Alt section bg | `--sunk` | #F3EDE3 | Warm beige |
| Primary text | `--ink` | #261E19 | Warm near-black |
| Secondary text | `--ink-soft` | #6E635A | Gray |
| Muted text | `--ink-mute` | #9C9084 | Light gray |
| **Brand accent** | **`--brand`** | **#E14B33** | **Vermilion — use this!** |
| Brand hover | `--brand-deep` | #BE3B27 | Darker vermilion |
| Brand background | `--brand-soft` | #FBE7E2 | Light tint |
| Top scores only | `--saffron` | #E6A437 | Gold (70–89 tier) |
| Dark background | `--surface-dark` | #17110D | Theater black |
| Score 90–100 | `--score-masterpiece` | #E14B33 | Vermilion |
| Score 70–89 | `--score-loved` | #E6A437 | Saffron |
| Score 50–69 | `--score-worth-watch` | #C07A4E | Clay |
| Score 0–49 | `--score-not-for-me` | #8C8A93 | Slate |

---

## 🔤 Typography (Quick Reference)

### Fonts
- **Hanken Grotesk** (UI, body) → `var(--font-ui)`
- **Instrument Serif** (display, titles) → `var(--font-serif)`
- **JetBrains Mono** (labels, metadata) → `var(--font-mono)`

### Common Classes
```
.text-display-xl     /* 86px hero */
.text-display-lg     /* 46px heading */
.text-display-md     /* 34px tagline (italic) */
.text-serif-lg       /* 30px title */
.text-body           /* 16px body, soft color */
.text-body-lg        /* 18px body */
.text-ui-title       /* 17px UI heading */
.text-kicker         /* 12px mono, uppercase, brand color */
.text-label          /* 11px mono, muted */
.text-meta           /* 12px mono data */
```

---

## 🧩 Component Classes (Quick Reference)

### Buttons
```jsx
className="btn-primary"    {/* Vermilion pill, white text, shadow */}
className="btn-secondary"  {/* Bordered pill, inverts on hover */}
className="btn-ghost"      {/* Transparent, brand text */}
```

### Badges & Scores
```jsx
className="score-badge"     {/* Squircle, sized by score tier */}
className="score-badge lg"  {/* 104px large version */}
className="r-seal"          {/* Logo tile, 38px */}
className="r-seal lg"       {/* Logo tile, 88px */}
```

### Cards
```jsx
className="card"            {/* Light card, soft shadow */}
className="card-dark"       {/* Dark card, deep shadow */}
className="card:hover"      {/* Auto-lifts and deepens shadow */}
```

### Layout
```jsx
className="container-brand"       {/* 1180px max-width, centered */}
className="section-lg"            {/* 96px padding */}
className="grid-3 gap-lg"         {/* 3-column responsive grid */}
className="section-dark"          {/* Dark theater background */}
className="flex-center"           {/* Flexbox centered */}
```

### Forms
```jsx
className="chip"            {/* Genre chip, toggles active */}
className="search-field"    {/* Pill input with focus states */}
className="tabs-nav"        {/* Tab navigation container */}
className="tab active"      {/* Active tab with brand underline */}
```

---

## ✨ Animations

### Built-In Hover Effects
Buttons, cards, scores automatically get:
- Lift (translateY -1px to -3px)
- Brighten (filter brightness)
- Shadow deepen (0.25s transition)

### Pulse Glow (For Dark Backgrounds)
```jsx
<div className="bg-dark relative">
  <div className="glow-vermilion glow-pulse" style={{ top: '-100px', right: '-100px' }} />
  <div className="glow-saffron glow-pulse" style={{ bottom: '-100px', left: '-100px' }} />
  {/* Content */}
</div>
```

### Accessibility
All animations respect `prefers-reduced-motion` in OS settings.

---

## 🔄 Workflow: From Design to Code

1. **See it in the design files** → `web/design-handoff/*.dc.html` (open in browser)
2. **Find the color/token** → Check `BRAND_GUIDE.md` for the CSS variable
3. **Use it in code** → Apply via utility class or style prop
4. **Test on component** → Make sure hover/interactions feel right
5. **Ship it** → Commit and enjoy the new brand ✨

---

## 📋 Implementation Checklist

### Phase 1: ✅ DONE
- [x] Design tokens in globals.css
- [x] Typography system (3 fonts, all scales)
- [x] Utility classes (buttons, cards, scores, layout)
- [x] Animations (glow pulse, hover, transitions)
- [x] Design handoff files added to project
- [x] Comprehensive documentation

### Phase 2: TODO (Start Here)
- [ ] Update ScoreCircle.js → squircle + tier colors (HIGH)
- [ ] Update MovieCard.js → colors, typography (HIGH)
- [ ] Update Navigation/Header → R-seal logo, colors (HIGH)
- [ ] Update Onboarding → colors, fix bugs (MEDIUM)
- [ ] Implement Comparison mechanic → taste builder (MEDIUM)
- [ ] Update other components → modals, forms, etc. (LOWER)

---

## 🎓 Examples

### Update a Color
**Before:**
```jsx
<div className="bg-stone-100 text-stone-700">...</div>
```

**After:**
```jsx
<div className="bg-[var(--sunk)] text-[var(--ink)]">...</div>
```
Or use the built-in `.card` class for auto-styling.

### Create a Score Badge
**Before:**
```jsx
<div className="rounded-full border border-orange-200 bg-white">85</div>
```

**After:**
```jsx
<div className="score-badge" style={{ backgroundColor: 'var(--score-loved)', color: 'var(--ink)' }}>85</div>
```
Or better yet, update `ScoreCircle.js` per the plan.

### Create a Hero Section
**Before:**
```jsx
<section className="bg-black">...</section>
```

**After:**
```jsx
<section className="section-dark relative overflow-hidden">
  <div className="glow-vermilion glow-pulse" style={{ top: '-100px', right: '-100px' }} />
  <div className="glow-saffron glow-pulse" style={{ bottom: '-100px', left: '-100px' }} />
  <div className="container-brand">
    <h1 className="text-display-xl text-[var(--cream-light)]">...</h1>
  </div>
</section>
```

---

## 🆘 Troubleshooting

**Q: Colors not showing?**
A: Make sure `globals.css` is imported in your layout. It should be at `app/layout.js` or `app/globals.css`.

**Q: Fonts not loading?**
A: Google Fonts import is in `globals.css` at the top. Check browser console for any font-loading errors.

**Q: Utility class not working?**
A: Tailwind v4 supports CSS variables directly (`bg-[var(--paper)]`). Make sure postcss.config.mjs has `@tailwindcss/postcss`.

**Q: Want to customize a color?**
A: Edit `globals.css` `:root` section. All variables are there, easy to adjust.

---

## 📞 Need Help?

- **System reference:** See `web/BRAND_GUIDE.md`
- **Implementation guide:** See `web/BRAND_IMPLEMENTATION_PLAN.md`
- **Visual specs:** Open `web/design-handoff/*.dc.html` in a browser
- **Token definitions:** Check `web/app/globals.css`

---

## 🎬 Next Steps

1. **Run the app** and see the current state
2. **Read BRAND_GUIDE.md** to understand the full system
3. **Open the design files** to see the intended look
4. **Start with ScoreCircle.js** — it's the most visible component
5. **Update MovieCard.js** — lots of color changes
6. **Update Navigation** — add the R-seal logo
7. **Test, adjust, ship!**

---

**You're all set! The design system is built. Now update the components to use it. 🚀**
