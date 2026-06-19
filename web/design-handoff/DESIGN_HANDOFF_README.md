# Handoff: Rasika — Brand & Visual Identity

## Overview
**Rasika** is a film-discovery and ranking platform. A *rasika* is a connoisseur — someone who savours stories. The product's reason to exist is **personal taste**: instead of one global score, Rasika predicts *how much **you** will love a film*, and connects you to people who share your taste ("taste twins"). Indian cinema is the starting point, but the brand is intentionally culture-agnostic so it can expand.

**Tagline:** *Discover stories you'll love.*

**Positioning (important for tone):**
- Taste over information. The product answers "what should I watch next?", not "what score did this get?"
- Ratings matter, but they're **personal**. Every film has a global score *and* a per-user "match."
- Warm, editorial, premium — with dramatic "dark theater" moments. Playful but never cute.
- **No emoji** anywhere. **Never name competitors** (no IMDb / Rotten Tomatoes references in copy).

---

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that show the intended look, feel, and behavior. They are **not production code to copy directly**. They are authored in a small bespoke component format (`.dc.html`); treat them as visual specs.

Your task is to **recreate these designs in the target codebase's environment** (React, Vue, SwiftUI, native, etc.) using its established patterns, component libraries, and conventions. If no environment exists yet, choose the most appropriate framework for the project and implement there. Everything you need to rebuild without seeing the prototypes is documented below.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are final and intentional. Recreate the UI faithfully using the codebase's libraries. The only placeholders are **movie posters** (striped boxes labeled `[ POSTER ]`) — wire these to real poster imagery.

---

## Design Tokens

### Color — Foundation (warm, not neutral)
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FAF7F1` | Default page background (warm off-white) |
| `--card` | `#FFFFFF` | Card surfaces |
| `--sunk` | `#F3EDE3` | Alternating section background |
| `--line` | `#E7DFD3` | Borders, hairlines, dividers |
| `--ink` | `#261E19` | Primary text (warm near-black) |
| `--ink-soft` | `#6E635A` | Secondary text / body |
| `--ink-mute` | `#9C9084` | Tertiary text, captions, mono labels |

### Color — Brand
| Token | Hex | Use |
|---|---|---|
| `--brand` (Vermilion) | `#E14B33` | THE brand color. Buttons, accents, top scores, the bindu (the dot after "Rasika") |
| `--brand-deep` | `#BE3B27` | Pressed/hover-deepened vermilion |
| `--brand-soft` | `#FBE7E2` | Tinted vermilion background (active chips, eyebrow pills) |
| `--saffron` | `#E6A437` | Reserved — used ONLY for the "Loved it" score tier and small celebratory accents. Never a general UI color. |

### Color — Dark "theater" (spotlight surfaces)
| Token | Hex | Use |
|---|---|---|
| `--surface-dark` | `#17110D` | Dark theater background (hero, sign-up band) |
| dark card | `#1F1711` | Cards on dark, border `#322519` |
| poster stripes (dark) | `#241A14` / `#2E2219` | Placeholder fill on dark |
| cream text | `#F7F0E4` (headlines), `#F4ECDE` (UI) | Text on dark |
| muted cream | `#C3B6A2` (body), `#B7A993` (nav) | Secondary text on dark |
| faint cream | `#8A7D6B` | Captions/mono on dark |
| theater glow | vermilion `rgba(225,75,51,.50)` + saffron `rgba(230,164,55,.26)` radial gradients, `blur(24px)` | Soft animated light pools behind hero/CTA |

### The Rasika Score (0–100) — the signature element
Color **is** the rating. Warmth increases with the score. Two distinct shapes:
- **Global score** = a **squircle** badge (`border-radius: 28%`), bold number, ~`Hanken 800`.
- **Your match** = a **vermilion ring** (CSS `conic-gradient` dial) showing a **percentage** — visually distinct so it's never confused with the global score.

| Score range | Label | Fill | Text |
|---|---|---|---|
| 90–100 | "A masterpiece" | `#E14B33` (vermilion) | `#FFFFFF` |
| 70–89 | "Loved it" | `#E6A437` (saffron) | `#261E19` (ink) |
| 50–69 | "Worth a watch" | `#C07A4E` (clay) | `#FFFFFF` |
| 0–49 | "Not for me" | `#8C8A93` (slate) | `#FFFFFF` |

Reference logic:
```js
function scoreFill(v) {
  if (v >= 90) return '#E14B33';
  if (v >= 70) return '#E6A437';
  if (v >= 50) return '#C07A4E';
  return '#8C8A93';
}
function scoreText(v) { return (v >= 70 && v < 90) ? '#261E19' : '#FFFFFF'; }
function scoreLabel(v) {
  if (v >= 90) return 'A masterpiece';
  if (v >= 70) return 'Loved it';
  if (v >= 50) return 'Worth a watch';
  return 'Not for me';
}
```
"Your match" ring (e.g. 95%): outer circle `conic-gradient(var(--brand) 0% 95%, #EFE1DC 95% 100%)`, inner white circle holds the `95%` + a small `match` label.

### Typography
Three families, loaded from Google Fonts:
- **Instrument Serif** (400 + italic) — *display*: the wordmark, hero/section headlines, large editorial numbers, italic pull-quotes. High-contrast, elegant.
- **Hanken Grotesk** (400/500/600/700/800) — *UI & body*: buttons, body copy, score numbers, nav.
- **JetBrains Mono** (400/500/600) — *technical layer*: kickers, metadata, labels, year·language strings, tokens.

Scale (use as reference, all px):
| Role | Family / weight | Size | Notes |
|---|---|---|---|
| Hero display | Instrument Serif 400 | 84–90 (landing), up to 140 (brand masthead) | `line-height: ~0.95–0.98`, `letter-spacing: -0.01em` |
| Section heading | Instrument Serif 400 | 44–52 | `line-height: ~1.05` |
| Card/film title | Instrument Serif 400 | 20–30 | |
| UI title | Hanken Grotesk 700 | 16–17 | |
| Body | Hanken Grotesk 400 | 16–19 | `line-height: ~1.6`, color `--ink-soft` |
| Kicker / label | JetBrains Mono 500 | 11–12 | `text-transform: uppercase; letter-spacing: 0.12–0.18em`, color `--ink-mute` or `--brand` |
| Score number | Hanken Grotesk 800 | 16–46 | tracking `-0.02em` |

### Radius
- Cards & buttons: `--radius` = **16px** (default "Soft") or **4px** ("Sharp" variant).
- Chips, pills, nav buttons, score "your match" ring, search field: **999px** (full pill / circle).
- Score squircle (global): **28%**.
- App icon / "R-seal" / avatars: **22%**.

### Shadow
- Card rest: `0 1px 3px rgba(0,0,0,.08)`
- Elevated card / hover: `0 18px–24px 40px–50px rgba(38,30,25,.10–.16)`
- Vermilion CTA (light bg): `0 8px 20px rgba(225,75,51,.26)`
- Vermilion glow (dark bg): `0 10px 30px rgba(225,75,51,.40)` + `box-shadow: 0 0 22px rgba(225,75,51,.5)` on the icon
- Dark card: `0 30px 60px rgba(0,0,0,.55)`

### Spacing & layout
- Page max-width: **1200px** (landing), **1180px** (brand sheet), centered, `padding: 0 36px`.
- Section vertical padding: **80–96px**.
- Grid gaps: **24px** (cards), **40–60px** (two-column splits).
- Inline element gaps: **10–12px** (button rows), **8–10px** (chips).
- Alternate section backgrounds for rhythm: `--paper` → `--sunk` → `--paper` …, with `--surface-dark` reserved for "spotlight" moments (hero, sign-up).

---

## Logo & Mark
- **R-seal**: a rounded-square tile (`border-radius: 22%`), `--brand` fill, containing a white **"R" set in Instrument Serif**, optical `margin-top: -2px`. Sizes 30–88px. Doubles as app icon and avatar. On dark, may carry a vermilion glow (`box-shadow: 0 0 22px rgba(225,75,51,.5)`).
- **Wordmark**: "Rasika" in Instrument Serif, with a **vermilion period** (the "bindu") — `Rasika.` where the `.` is `color: var(--brand)`.
- **Lockup**: R-seal + wordmark, gap ~13–26px depending on scale.
- **Rules**: clearspace ≥ the height of the R-seal on all sides; minimum mark size 24px; never recolor the wordmark; never stretch.

---

## Screens / Views

### 1. Landing — hybrid (file: `Rasika Landing v2.dc.html`) — the recommended home
A vertical scroll alternating **dark theater** and **airy editorial** bands:

1. **Hero (dark theater)** — full-bleed `--surface-dark` with two animated radial glows (vermilion top-right, saffron bottom-left, `blur(24px)`, slow `glowpulse` 7–9s).
   - **Nav lives inside the hero** (transparent over dark): R-seal + "Rasika" (cream) left; links "Charts / Lists / Fandoms" (`#B7A993`), divider, "Log in" (cream), and a **"Join Rasika"** vermilion pill button (glowing) right.
   - Left column: a gold-outline eyebrow pill ("Trending across Indian cinema", `#F0C98A` text, `1px solid rgba(230,164,55,.4)`); H1 "Discover stories / you'll love**.**" (Instrument Serif 86px, cream, vermilion bindu); body (`#C3B6A2`); an **email capture row** (translucent dark input `rgba(255,255,255,.06)` + vermilion "Get started" button); trust line "Free forever · No ads · 4,200+ films" (mono, `#8A7D6B`).
   - Right column: a **cluster of 3 dark poster cards** (`#1F1711`, rotated -6°/+4°/-3°, overlapping) each with a glowing score squircle (91 vermilion, 88 saffron, 84 saffron).
2. **How it works (airy, `--sunk`)** — kicker "How Rasika works"; heading "Your taste, turned into a number you trust."; 3 white step cards: **01 Rank**, **02 Discover**, **03 Share** (big serif numeral in vermilion + serif title + body).
3. **Your score (airy, `--paper`)** — the differentiator. Kicker "What makes Rasika different"; heading "Not just a score. Your score."; two bullet points (Your match / Taste twins). Right: a demo film card ("Eeb Allay Ooo!", 2019 · Hindi) showing the **dual score** side by side — a 95% vermilion **match ring** ("Your match · almost certainly you") and a **68 clay squircle** ("Global score · mixed reviews") — an italic verdict line, and a **taste-twins** row (overlapping initial-avatars + "Loved by 1,240 of your taste twins").
4. **The Rasika 100 (airy, `--sunk`)** — left: heading + "Explore the full chart ▸" outline button; right: a "This week's top five" ranked list (rank numeral in serif, poster thumb, title + mono meta, score squircle).
5. **Sign-up band (dark theater)** — `--surface-dark` with a centered top glow; kicker "Join in 30 seconds"; large serif "Start ranking tonight**.**"; body; centered email capture ("Create account").
6. **Footer (airy)** — R-seal + wordmark + italic tagline left; mono links (About / Charts / Apps / Contact) right.

### 2. Brand guide (file: `Rasika Brand.dc.html`)
The full system reference: masthead, the mark + variations + clearspace, color palette with tokens/hex/oklch, the Rasika Score (tiers + an interactive 0–100 slider that recolors a live badge), the three typefaces + scale, components (buttons, search, genre chips, tabs), and an "in context" feature card + ranking list. Use this as the canonical token/spec source.

### 3. Comparison mechanic (file: `Rasika Compare.dc.html`)
A focused, playful "build your taste" screen. See Interactions below.

### 4. Vibrant exploration (file: `Rasika Vibrant.dc.html`)
Two alternative energy directions (A: dark theater, B: bright vermilion "pop"). Reference/optional — the hybrid landing already adopts the dark-theater direction.

---

## Components (recreate as reusable components)
- **Button / primary**: Hanken 700, white on `--brand`, pill (`999px`), padding `~13–16px 24–30px`, shadow `0 6–8px 16–20px rgba(225,75,51,.26)`; hover `filter: brightness(1.05); translateY(-1px)`.
- **Button / secondary**: Hanken 700, `--ink` text, `1.5px solid --ink`, transparent; hover inverts to `--ink` bg / white text.
- **Button / ghost**: Hanken 700, `--brand` text, transparent; hover `--brand-soft` bg.
- **Genre chip**: Hanken 600, 14px, pill; default `#F1EBE1` bg / `#5E544B` text; active `--brand-soft` bg / `--brand` text.
- **Search field**: pill, `1.5px solid #E0D7C9`, `--paper` fill, leading `⌕` glyph, trailing `⌘K` key hint (mono, in a 1px-bordered 6px-radius box).
- **Tabs**: Hanken; active = `--ink` text + `2px solid --brand` underline; inactive = `--ink-mute`.
- **Score badge (global)**: squircle 28%, `scoreFill/scoreText` by value, Hanken 800.
- **Match ring (your score)**: conic-gradient dial in `--brand`, inner white well with `N%` + "match".
- **Taste-twins avatars**: 34px circles, warm fills (`#E14B33`,`#E6A437`,`#C07A4E`,`#7A6A5C`), `2px solid #fff`, overlapped `margin-left: -11px`, trailing `+N` overflow chip.
- **Movie card / ranking row**: poster (3:4) + serif title + mono meta (`YYYY · Language · Genre`) + score badge.

---

## Interactions & Behavior
- **Hover**: buttons lift `translateY(-1px)` + brighten; cards lift `translateY(-3px)` + deepen shadow; rows tint to `--paper`. Transitions ~`0.25s ease`.
- **Glow animation** (`glowpulse`): `@keyframes glowpulse { 0%,100% { opacity:.55; transform:scale(1) } 50% { opacity:.85; transform:scale(1.08) } }`, applied to the radial-gradient glow divs (7–9s, infinite). Decorative; respect `prefers-reduced-motion`.
- **Comparison mechanic** (`Rasika Compare.dc.html`):
  - Prompt + two film/actor cards with a "vs" token between. User clicks a side.
  - On pick: chosen card gets a `2px solid --brand` border + lift + glow + a "✓ Your pick" pill; the other dims to `opacity: .42`. A taste-signal line (italic serif, `--brand`) appears, e.g. "Noted — you lean into Lokesh-universe action." After ~1.25s it auto-advances to the next matchup.
  - Secondary actions: "Loved both equally", "Haven't seen one", "Skip ▸" — each advances with an appropriate signal (~0.95s).
  - Top bar shows progress: "{N} compared" + a fill bar + "{N×8, capped 99}% mapped".
  - Matchups cycle (film-vs-film and actor-vs-actor). Drives a taste profile in the real product.

## State Management
- **Score**: each film needs `globalScore` (0–100) and a per-user `matchPercent` (0–100). Derive badge fill/text/label from `globalScore` via the functions above.
- **Comparison**: `index` (current matchup), `picked` (`'left' | 'right' | 'both' | null`), `signal` (string), `count` (comparisons made). Picking sets `picked` + `signal` + increments `count`, then a timer advances `index` and resets `picked`/`signal`. In production, each verdict updates the user's taste model.
- **Taste twins / recommendations**: server-driven ("people like you loved…").

## Assets
- **Fonts**: Google Fonts — Instrument Serif, Hanken Grotesk, JetBrains Mono. Self-host in production if preferred.
- **Posters**: placeholders only in the prototypes (`[ POSTER ]` striped boxes). Wire to real poster imagery (3:4). Score badges overlay the poster top-right.
- **No raster brand assets** — the logo is type + a CSS tile; rebuild it natively.
- **Sample film titles** in mocks (Tumbbad, Super Deluxe, Pariyerum Perumal, Jallikattu, Court, etc.) are illustrative.

## Files
- `Rasika Brand.dc.html` — full brand system / token source of truth
- `Rasika Landing v2.dc.html` — the hybrid landing (recommended home)
- `Rasika Compare.dc.html` — the comparison / taste-building mechanic
- `Rasika Vibrant.dc.html` — two energy explorations (reference)

Open any file directly in a browser to view it. They are visual references — rebuild in your codebase's framework and design patterns.
