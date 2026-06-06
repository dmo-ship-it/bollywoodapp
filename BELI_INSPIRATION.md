# Beli App — Design Inspiration

Screenshots and patterns from the Beli restaurant rating app to inspire the Bolly cinema experience.

---

## Screenshots

### Full App Overview
![Beli Overview](https://ixd.prattsi.org/wp-content/uploads/2024/09/Untitled-10-1024x619.png)

### Home / Your List
![Home Screen](https://ixd.prattsi.org/wp-content/uploads/2024/09/2-2-1024x721.png)

### Rating & Comparison Flow
![Rating Flow](https://ixd.prattsi.org/wp-content/uploads/2024/09/3-1-1536x1070-1-1024x714.png)

### Comparison Screen
![Comparison](https://ixd.prattsi.org/wp-content/uploads/2024/09/4-1024x721.png)

### Profile Page
![Profile](https://ixd.prattsi.org/wp-content/uploads/2024/09/5-1024x721.png)

### Friends / Social
![Friends](https://ixd.prattsi.org/wp-content/uploads/2024/09/6-1024x721.png)

### Leaderboard / Match Score
![Leaderboard](https://ixd.prattsi.org/wp-content/uploads/2024/09/7-1024x721.png)

### Restaurant Detail Page
![Detail](https://ixd.prattsi.org/wp-content/uploads/2024/09/8-578x1024.png)

### Lists / Ranked View
![Lists](https://ixd.prattsi.org/wp-content/uploads/2024/09/9-1024x721.png)

### Tags & Filters
![Tags](https://ixd.prattsi.org/wp-content/uploads/2024/09/10-1024x721.png)

### Taste Profile
![Taste Profile](https://ixd.prattsi.org/wp-content/uploads/2024/09/11-1024x721.png)

### iOS App — Home List View
![iOS List](https://ixd.prattsi.org/wp-content/uploads/2022/02/IMG_2602-5-473x1024.png)

### iOS App — Rating Comparison
![iOS Comparison](https://ixd.prattsi.org/wp-content/uploads/2022/02/IMG_2619-473x1024.png)

### iOS App — Restaurant Detail
![iOS Detail](https://ixd.prattsi.org/wp-content/uploads/2022/02/IMG_2620-2-473x1024.png)

### iOS App — Profile
![iOS Profile](https://ixd.prattsi.org/wp-content/uploads/2022/02/IMG_2625-3-473x1024.png)

---

## Visual Design Analysis (from viewing actual screenshots)

### Palette — extremely restrained
- **Background**: Pure white (#FFFFFF) — no off-whites, no tinted backgrounds
- **Text**: Near-black for primary, medium gray for secondary — good contrast, no color
- **Accent**: Dark teal-green, used ONLY for the logo, the + FAB button, and "Apply" — nowhere else
- **Rating circles**: Muted pastels — soft green, soft yellow/cream, soft pink/salmon — NOT saturated
- **No orange. No gradients. No glow effects.**

### Buttons — barely there
- Primary CTA ("Get Started"): small teal pill, normal font weight, no shadow
- Action buttons ("Invite"): tiny blue pills — almost disappear into the UI
- Filter chips: outlined, no fill, very light border
- **Nothing is padded aggressively. py-2 at most.**

### Rating options — circles not tiles
- Three soft colored circles side by side: 🟢 "I liked it" / 🟡 "It was fine" / 🔴 "I didn't like it"
- No borders, no shadows — just a muted fill color
- Tap the circle, it gets a subtle ring — that's it

### Cards / rows — minimal chrome
- Feed items: avatar + "[Name] ranked [Restaurant]" + score badge (small, right-aligned)
- Score badge: plain number "10.0" in a tiny outlined box — not colored, not bold
- Heart/comment icons: outline only, light gray — not filled until interacted with
- Thin hairline dividers between items — or no dividers at all, just spacing

### Typography
- Font weight: medium/semibold for names, regular for metadata — no "font-black" anywhere in UI chrome
- Font size: small and controlled — nothing oversized except the restaurant name itself
- Section labels: tiny uppercase tracking-widest, light gray — exactly like "How was it?"

### Spacing
- Generous padding inside screens (px-5 or more)
- Modest internal padding on components (p-3 or p-4)
- Items breathe — not crammed together

### What to AVOID (what we were doing wrong)
- ❌ Saturated orange everywhere
- ❌ `font-black` on UI buttons
- ❌ `bg-gradient-to-r from-orange-400 to-rose-400` 
- ❌ `py-4` buttons
- ❌ `border-2 border-orange-400` as selected state
- ❌ Multiple competing accent colors
- ❌ Shadows on everything

---

## Key Design Patterns to Borrow

### Navigation
- **Minimal bottom nav** — only 3 items: List, + (add), Profile
- Sparse navigation reduces cognitive load
- The `+` button is the primary call to action

### Rating Flow (the Beli magic)
1. User taps `+` on a card or detail page
2. **Rate** — simple choice (not stars, more like "loved / liked / okay / meh")
3. **Optional extras** — notes, tags, favourite dish (skippable)
4. **Comparison** — "Which did you prefer?" forced choice between two same-tier items
5. Score is calculated from comparison wins, not just the raw rating

### Comparison Screen
- Two items side by side, large cards with photos
- "Too Tough to Call" skip option at the bottom
- Clean, no distractions — just the two choices

### Cards
- Clean white cards with subtle shadows
- Restaurant photo prominent
- Score shown as a number (not stars)
- Friend match % shown in color (green = high match, red = low)

### Colors
- Dark green accent for selected states and high scores
- Color-coded scores: green (high) → yellow → red (low)
- Teal bookmark icon that fills on save
- Predominantly white/light background

### Profile
- Ranked list as the centrepiece
- "Match Score" with friends — shows % compatibility
- "Taste Profile" section showing preferences
- "Places you both want to try" shared wishlist with friends

### Social / Leaderboard
- Friends ranked by match % to you
- Color-coded match scores
- Progress bars toward unlocking features
- Milestone celebrations

### Restaurant Detail Page
- Large header photo
- Quick action icons (directions, call, website) — no labels needed
- Address on map embedded
- Notes / favourite dishes from friends visible

---

## What We Should Apply to Bolly

| Beli Pattern | Bolly Equivalent |
|---|---|
| Minimal bottom nav (3 items) | Simplify our nav |
| `+` button opens rating modal | ✅ Done |
| Rating → extras → comparison | ✅ Done |
| "Too Tough to Call" skip | ✅ Already in compare modal |
| Color-coded match % with friends | Taste Twins % (✅ Done) |
| Taste Profile tab | ✅ Done |
| Score as number, not stars | Consider showing score on cards |
| Card-first design | Movie cards with poster focus |
| Milestone unlocks | ✅ Tier system (Founder → Legendary) |
| Notes on a rating | ✅ Done (notes field in extras) |

---

## Sources
- [Design Critique: Beli App (2024) — IXD @ Pratt](https://ixd.prattsi.org/2024/09/design-critique-beli-app/)
- [Design Critique: Beli iOS App (2022) — IXD @ Pratt](https://ixd.prattsi.org/2022/02/design-critique-beli-ios-app/)
- [Redesigning Beli — Medium](https://medium.com/@aw766/redesigning-beli-what-do-you-find-yummy-1fad45a7cbcc)
- [Beli Official Site](https://beliapp.com/)
