# Rasika Brand Guidelines — Delivery Manifest

**Date:** June 19, 2026  
**Status:** ✅ Phase 1 Complete — Design System Live  
**Package:** Rasika Website Branding (from Claude Design)

---

## 📦 Deliverables

### 1. Complete Design System (706 lines of CSS)
**File:** `web/app/globals.css`

✅ **Design Tokens:**
- 40+ color variables (foundation, brand, dark theater, score tiers)
- Typography (3 Google Fonts with all scales)
- Spacing system (gaps, containers, section padding)
- Radius tokens (16px default, 28% squircle, 22% avatar, 999px pill)
- Shadow system (8 variants: card, brand, dark, elevated, hover, glow, etc.)

✅ **Utility Classes (50+):**
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- Components: `.score-badge`, `.score-ring`, `.r-seal`, `.wordmark`, `.chip`, `.search-field`
- Cards: `.card`, `.card-dark`
- Layout: `.container-brand`, `.section-lg/md/sm`, `.grid-2/3/4/6`, `.flex-center`, `.flex-between`
- Typography: `.text-display-*`, `.text-serif-*`, `.text-body*`, `.text-kicker`, `.text-label`, `.text-meta`
- Sections: `.section-paper`, `.section-sunk`, `.section-dark`
- Animations: `.glow-pulse`, `.animate-fade-in`, hover effects
- Accessibility: `prefers-reduced-motion` support

### 2. Documentation (4 files, 34 KB)

**File:** `web/BRAND_GUIDE.md` (8.0 KB)
- Complete token reference (colors, typography, spacing, radius, shadows)
- Component specifications (buttons, forms, scores, avatars, logo)
- Animation documentation
- Score logic and card styles
- Tone & voice guidelines

**File:** `web/BRAND_IMPLEMENTATION_PLAN.md` (9.1 KB)
- Phase 1 status (✅ Complete)
- Phase 2 roadmap with code examples
- Implementation checklist
- Utility class cheat sheet
- Component-by-component update guide

**File:** `BRAND_UPDATE_SUMMARY.md` (7.2 KB)
- What you've received overview
- Color and typography reference tables
- Utility class quick reference
- How to use (CSS, Tailwind, inline styles)
- Next steps checklist

**File:** `RASIKA_BRAND_QUICK_START.md` (9.9 KB)
- Quick start guide (5 min overview)
- File structure map
- Color palette quick reference
- Typography quick reference
- Component classes quick reference
- Examples and workflow

### 3. Design Handoff Files (Visual References)
**Directory:** `web/design-handoff/` (93 KB total)

✅ `Rasika Brand.dc.html` (32 KB)
- Full system reference (interactive in browser)
- Logo mark variations with clearspace rules
- Complete color palette with tokens and hex codes
- Rasika Score interactive demo (0–100 slider)
- Typography scale with all families and weights
- Component library (buttons, chips, badges, etc.)

✅ `Rasika Landing v2.dc.html` (23 KB)
- Recommended landing page design
- Hero section with dark theater background
- "How it works" section (3-step cards)
- "Your score" differentiation (dual score display)
- Rasika 100 chart example
- Sign-up band and footer

✅ `Rasika Compare.dc.html` (11 KB)
- Taste-building comparison mechanic
- Two-card "vs" interaction
- Flavor signal line example ("Noted — you lean into...")
- Progress bar ("X compared · Y% mapped")
- Secondary actions (Loved both / Haven't seen / Skip)

✅ `Rasika Vibrant.dc.html` (12 KB)
- Energy direction explorations
- Dark theater vs. bright vermilion approaches
- Reference material for future iterations

✅ `DESIGN_HANDOFF_README.md` (15 KB)
- Complete design specifications document
- About the design files (how to use them)
- Detailed color tokens with usage notes
- Logo and mark specifications
- Screen/view descriptions
- Component specs and interactions
- Assets and implementation notes

### 4. Memory Documentation
**Location:** `/Users/deshmohan/.claude/projects/-Users-deshmohan-bollywood-app/memory/`

✅ `rasika-brand-implementation.md`
- Project memory recording the implementation
- What's been done (complete design system)
- What needs updating (component roadmap)
- Reference for future conversations

---

## 🎯 System Overview

### Color Palette (Implemented)
```
Foundation:  #FAF7F1 (paper) → #F3EDE3 (sunk) → #E7DFD3 (line)
Inks:        #261E19 (ink) → #6E635A (soft) → #9C9084 (mute)
Brand:       #E14B33 (vermilion) — SINGLE brand accent color
Saffron:     #E6A437 — Top scores only (70–89)
Dark:        #17110D (theater) → #1F1711 (card) → Cream tones
Score Tiers: Slate (0–49) → Clay (50–69) → Saffron (70–89) → Vermilion (90–100)
```

### Typography (Implemented)
```
Instrument Serif (400 + italic)    — Display, headers, wordmark
Hanken Grotesk (400–800)           — UI, body, buttons, scores
JetBrains Mono (400–600)           — Labels, metadata, kickers
```

### Component System (Implemented)
```
Buttons:      .btn-primary (brand pill) | .btn-secondary (bordered) | .btn-ghost (transparent)
Scores:       .score-badge (squircle, tier colors) | .score-ring (percentage dial)
Cards:        .card (light) | .card-dark (theater)
Logo:         .r-seal (tile) | .wordmark (serif) | .lockup (combined)
Layout:       .container-brand | .grid-* | .section-* | .flex-*
Forms:        .chip | .search-field | .tabs-nav | .tab
Typography:   .text-display-* | .text-serif-* | .text-body* | .text-kicker | .text-label
Animations:   .glow-pulse | .animate-fade-in | .score-hover (hover effects)
```

---

## ✅ Implementation Checklist

### Phase 1: DONE ✅
- [x] Design tokens (colors, typography, spacing, radius, shadows)
- [x] Utility classes (50+ for common components)
- [x] Animations (glow pulse, hover effects, fade-in)
- [x] Google Fonts auto-loaded
- [x] Accessibility (prefers-reduced-motion)
- [x] Responsive breakpoints
- [x] Documentation (4 guides, 34 KB)
- [x] Design handoff files integrated (5 visual reference files)
- [x] Memory recorded for future conversations

### Phase 2: ROADMAP PROVIDED ⏳
- [ ] ScoreCircle.js — Update to squircle + tier colors (HIGH)
- [ ] MovieCard.js — Update colors, typography, shadows (HIGH)
- [ ] Navigation/Header — Add R-seal logo, cream colors (HIGH)
- [ ] Onboarding — Fix bugs, update colors (MEDIUM)
- [ ] Comparison mechanic — Implement taste builder (MEDIUM)
- [ ] Other components — Modals, forms, buttons (LOWER)

Full Phase 2 roadmap with code examples: `web/BRAND_IMPLEMENTATION_PLAN.md`

---

## 📚 How to Use This System

### Quick Reference
1. Colors: Check `globals.css` `:root` or `BRAND_GUIDE.md`
2. Typography: Use `.text-*` classes or `var(--font-serif/ui/mono)`
3. Components: Use `.btn-primary`, `.card`, `.score-badge`, etc.
4. Layout: Use `.container-brand`, `.grid-3`, `.section-dark`, etc.
5. Animations: Use `.glow-pulse` or hover animations (automatic on interactive)

### In Code (React/JSX)
```jsx
// CSS variables
<div style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)' }}>

// Utility classes
<button className="btn-primary">Click</button>
<div className="card">Content</div>
<h1 className="text-display-lg">Heading</h1>

// Tailwind with CSS variables
<div className="bg-[var(--paper)] text-[var(--ink)]">
```

### For Developers
1. Read `BRAND_GUIDE.md` for complete reference
2. Read `BRAND_IMPLEMENTATION_PLAN.md` for component update roadmap
3. Open `design-handoff/*.dc.html` in browser for visual specs
4. Check `globals.css` for actual CSS implementation
5. Use `RASIKA_BRAND_QUICK_START.md` for quick lookup

### For Designers/Product
1. Open `design-handoff/Rasika Brand.dc.html` to see full system
2. Open `design-handoff/Rasika Landing v2.dc.html` for landing example
3. Open `design-handoff/Rasika Compare.dc.html` for interaction patterns
4. Reference `DESIGN_HANDOFF_README.md` for detailed specifications

---

## 📁 File Tree

```
bollywood-app/
├── DELIVERY_MANIFEST.md              ← You are here
├── BRAND_UPDATE_SUMMARY.md           ← What changed & next steps
├── RASIKA_BRAND_QUICK_START.md       ← 5-min overview
│
└── web/
    ├── app/
    │   ├── globals.css               ← 🎨 THE SYSTEM (706 lines)
    │   ├── components/
    │   │   ├── ScoreCircle.js        ← TODO: Update to squircle
    │   │   ├── MovieCard.js          ← TODO: Update colors
    │   │   └── ...
    │   └── ...
    │
    ├── BRAND_GUIDE.md                ← 📖 Complete reference
    ├── BRAND_IMPLEMENTATION_PLAN.md  ← 🛣️ Phase 2 roadmap
    │
    └── design-handoff/               ← 📚 Visual references
        ├── Rasika Brand.dc.html
        ├── Rasika Landing v2.dc.html
        ├── Rasika Compare.dc.html
        ├── Rasika Vibrant.dc.html
        └── DESIGN_HANDOFF_README.md
```

---

## 🚀 Next Steps

1. **Review** — Read `BRAND_GUIDE.md` (15 min)
2. **Explore** — Open `design-handoff/Rasika Brand.dc.html` in browser (10 min)
3. **Code** — Follow `BRAND_IMPLEMENTATION_PLAN.md` for component updates
4. **Test** — Run `npm run dev` and verify styles applied
5. **Ship** — Commit and deploy the new brand

**Estimated time to complete Phase 2:** 2–4 hours depending on scope

---

## 📝 Version Information

- **Source:** Rasika Website Branding.zip (Claude Design handoff)
- **Implementation Date:** June 19, 2026
- **Delivery Date:** June 19, 2026
- **System Status:** Production-ready (Phase 1)
- **Next Review:** After Phase 2 component updates

---

## ✨ Key Achievements

✅ **Complete design system** with 40+ color tokens, 3 typeface families, all scales  
✅ **50+ utility classes** ready to use across the app  
✅ **Animations** (glow pulse, hover effects) with accessibility support  
✅ **Google Fonts** auto-loaded (Instrument Serif, Hanken Grotesk, JetBrains Mono)  
✅ **Visual references** (5 design files) for specs and interactions  
✅ **Comprehensive documentation** (4 guides, 34 KB) for developers and designers  
✅ **Implementation roadmap** with code examples for Phase 2 component updates  
✅ **Memory recorded** for future conversation continuity  

---

## 🎬 You're Ready!

The design system is live. Now update components to use it. Start with `ScoreCircle.js` (highest impact, quickest win).

**See:** `web/BRAND_IMPLEMENTATION_PLAN.md` for the full roadmap and code examples.

---

**Built with ❤️ using Claude Design brand guidelines.**
