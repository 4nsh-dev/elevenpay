# ElevenPay — Premium Mobile Fintech UI Specification

**North star:** Apple Wallet's restraint · Revolut's confidence · Monzo's warmth. Dark-mode only. Football lives in the content and in gold moments — never in the chrome.

---

## 1. Color System

### Foundations

| Token | Hex | Use |
|---|---|---|
| `bg/base` | `#0B0F14` | app background — near-black charcoal, blue undertone |
| `bg/raised` | `#11161D` | scrolled headers, tab bar base |
| `surface/card` | `#161B22` | default card fill |
| `surface/card-hover` | `#1B212A` | pressed/hover card |
| `surface/glass` | `#161B22 @ 72%` + blur 24 | GlassCard fill over gradients |
| `surface/slate` | `#1E293B` | secondary surfaces, input fills, chips |
| `border/subtle` | `#FFFFFF @ 6%` | 1px card hairlines |
| `border/strong` | `#FFFFFF @ 12%` | focused inputs, active chips |

### Brand & semantic

| Token | Hex | Use |
|---|---|---|
| `brand/primary` | `#00C853` | primary actions, active states, the emerald identity |
| `brand/primary-press` | `#00B04A` | pressed primary |
| `brand/primary-soft` | `#00C853 @ 12%` | tints: selected chips, insight backgrounds |
| `accent/gold` | `#FFD54F` | **wins, prizes, rewards only** — never buttons, never decoration |
| `accent/gold-soft` | `#FFD54F @ 14%` | prize chips, winner card tint |
| `state/success` | `#00E676` | confirmations, received amounts |
| `state/error` | `#FF5252` | errors, failed tx |
| `state/warning` | `#FFB300` | not-backed-up chips, expiring reservations |
| `state/pending` | `#64B5F6` | pending/broadcast dots |

### Text

| Token | Hex | Use |
|---|---|---|
| `text/primary` | `#FFFFFF` | headings, amounts |
| `text/secondary` | `#94A3B8` | labels, captions, metadata |
| `text/tertiary` | `#5B6878` | placeholders, disabled |
| `text/on-primary` | `#04110A` | text on emerald buttons (near-black, not pure) |
| `text/positive` | `#00E676` | +20 USDT |
| `text/negative` | `#FFFFFF` | −5 USDT (white, not red — spending isn't an error; Monzo rule) |

### Gradients (used sparingly, 3 total)

- `grad/hero`: 135°, `#0E2A1D → #0B0F14` — hero wallet card backdrop.
- `grad/gold`: 135°, `#FFD54F → #FFB300` — winner moments only.
- `grad/pitch`: 180°, `#00C85310 → transparent` — the one football whisper: a faint emerald wash behind match cards, evoking pitch under floodlights without drawing one.

**Rules:** gold is earned, never ambient. Red only for true failures. Emerald is the only interactive color. Anything glowing must be information.

## 2. Typography

**Family:** Inter (variable). **Numerals:** `tabular-nums` for ALL amounts, countdowns, and lists — digits must not jitter.

| Style | Size/Line | Weight | Use |
|---|---|---|---|
| `display/balance` | 44/48 | Bold, -1% tracking | wallet balance |
| `display/amount` | 36/40 | Bold | keypad amount entry |
| `title/screen` | 24/30 | SemiBold | screen titles |
| `title/card` | 18/24 | SemiBold | card headings, match names |
| `body` | 15/22 | Regular | default text |
| `body/strong` | 15/22 | Medium | emphasized body, row titles |
| `caption` | 13/18 | Regular | metadata, timestamps |
| `caption/label` | 11/14 | Medium, +6% tracking, uppercase | section labels ("TODAY'S MATCH") |
| `button` | 16/20 | SemiBold | all buttons |
| `mono/address` | 13/18 | Regular, tabular | wallet addresses, hashes (Inter, not a code font) |

Currency style: amount in Bold, "USDT" suffix in `caption` `text/secondary`, baseline-aligned — `58.42 USDT`.

## 3. Spacing & Layout

**8-point grid:** 4 (icon-to-text) · 8 · 16 (default padding) · 24 (card padding, screen gutters) · 32 (section gaps) · 48 (hero breathing room).

- Screen gutter: 24. Card internal padding: 24 (compact rows: 16).
- Vertical rhythm: sections separated by 32; related cards stacked at 12.
- Touch targets: ≥ 48×48 always; keypad keys 64 tall.
- **Radius scale:** cards 24 · buttons 18 · inputs/chips 16 · bottom sheet top 28 · avatars circle · membership-ticket QR panel 12.
- **Shadows:** barely there — `0 8 24 rgba(0,0,0,0.35)` on floating elements (sheets, FAB) only; cards rely on fill contrast + hairline borders, not shadows.
- **Glass recipe (GlassCard):** blur 24, fill `surface/glass`, 1px `border/subtle`, inner top highlight `#FFFFFF @ 4%`. Use over `grad/hero` or imagery; solid `surface/card` elsewhere (glass everywhere = mud).

## 4. Components (specs)

- **GlassCard** — base surface. Padding 24, radius 24, glass recipe. Variants: `solid` (default list use), `glass` (hero/over-gradient), `outlined` (empty states).
- **WalletCard (hero)** — grad/hero backdrop, greeting `caption/label`, name `title/card`, "WORLD CUP WALLET" label, balance `display/balance` with count-up, chain chip bottom-right. Height ~200.
- **ActionButton** — 4-up grid; 56 circle `surface/slate` with 24 Lucide icon `brand/primary`, `caption` label below. Press: scale 0.94 + fill brighten.
- **MatchCard** — grad/pitch wash; crest initials in 40 circles (team colors), "vs" `caption`, kickoff countdown `tabular`, CTA chip. No photography.
- **PoolCard** — MatchCard + prize row: gold-soft chip `🏆 25 USDT` (the only ambient gold), participants avatar stack (−8 overlap, max 5 + "+12"), countdown.
- **PartyCard** — title, venue + distance `caption`, fee chip, seats-left indicator (turns `state/warning` under 20%).
- **TransactionCard (row)** — 44 icon disc (type glyph), title `body/strong`, memo/time `caption`, right-aligned amount (`text/positive` / `text/negative`), pending dot if in flight. Height 72.
- **PrimaryButton** — full-width 56, radius 18, emerald fill, `text/on-primary`. States: press (`primary-press`, scale 0.98) / disabled (fill @ 24%, text `text/tertiary`) / loading (label → 20 spinner, width locked).
- **SecondaryButton** — same geometry, `surface/slate` fill, white text. **Destructive** variant: transparent fill, `state/error` text.
- **SlideToConfirm** — 56 track `surface/slate`, 48 emerald thumb with chevron; past 85% snaps, haptic, morphs to spinner. The signature money control.
- **Input** — 52, radius 16, `surface/slate` fill, no border until focus (`border/strong`), label floats to `caption`. Error: hairline + message `state/error`, never a red fill.
- **AmountKeypad** — 3×4, `display/amount` echo above, quick chips (5/10/25/MAX) as `primary-soft` pills.
- **BottomSheet** — radius 28 top, grabber 36×4 `border/strong`, backdrop `#000 @ 60%`, spring-in. All confirms, details, and pickers live here.
- **AIMessage / UserMessage** — AI: left, `surface/card`, ✨ accent, radius 18 (4 at anchor corner). User: right, `primary-soft` fill. InsightChip: pill, ✨ + one line + chevron.
- **Avatar** — circle, image or initials on `brand/primary-soft` with emerald initials. Sizes 24/32/44/64.
- **StatusChip** — pill 24 high: PAID (`primary-soft`/emerald text), PENDING (`state/pending` tint), RESERVED (`warning` tint + countdown), FAILED (`error` tint).
- **FloatingAIButton** — 56 circle, emerald, ✨ icon, bottom-right 24 above tab bar; gentle 4s breathing scale (1.0→1.04); hides on scroll-down, returns on scroll-up.

## 5. Cards — hierarchy in one screen

Home stacks exactly four card weights, in order: hero (glass, gradient) → actions (naked grid, no card) → match/pool (solid + pitch wash) → insight (solid + ✨) → activity rows (flat list, hairline separators). Never two glass cards adjacent; never nested cards.

## 6. Navigation

- **Tab bar:** 5 tabs (Home · Wallet · Watch · AI · Profile), height 64 + safe area, `bg/raised` @ 92% + blur 16, hairline top. Active: icon + label `brand/primary` with a 4 dot underneath (dot slides between tabs, 250ms spring); inactive `text/secondary`. Icons: Lucide 24 — home, wallet, tv, sparkles, user.
- **Stacks/modals:** flows open as full-screen modals sliding up (iOS feel); in-flow steps push horizontally; Confirm is always a BottomSheet on top. Back = chevron-left 44 target; modals get X (left) — money flows never trap.
- **Headers:** transparent, `title/screen` appears in header on scroll (large-title collapse, Apple Wallet style).

## 7. Animations

**Curves:** `ease-out-expo` for entrances (0.16,1,0.3,1) · `spring(damping 18, stiffness 220)` for interactive elements · 150ms `ease-in` for exits. Durations: micro 150 · standard 250 · emphasis 400 · celebration 1200. Everything interruptible; no animation blocks input except signing.

**Signature moments (one per event type, from the design system):**

1. **Balance count-up** — 800ms ease-out-expo, tabular digits rolling; fires on Home mount and on balance change (old→new, not from 0).
2. **Transaction slide-in** — new row enters translateY(-12)+fade, 250ms; list below settles with a soft spring.
3. **Payment success** — check draws in (400ms stroke), emerald burst ring, double haptic, auto-dismiss 1200ms.
4. **Winner confetti** — full-screen gold particle burst (2s, gravity, ~120 particles) over `grad/gold` wash + prize count-up. Gold's one ambient appearance.
5. **Pool/party join** — card expands in place (spring) into its joined/ticket state; content cross-fades.
6. **Splash** — wordmark fades in (400ms), ⚽ dot settles with a single soft bounce, gradient breathes; total < 1.5s, skippable by tap.
7. **Skeleton shimmer** — 1.6s linear sweep, `#FFFFFF @ 4% → 8% → 4%`.
8. **Pull-to-refresh** — emerald orbit spinner (a dot circling a ring — subtle ball-around-pitch nod, reads as pure fintech).

**Reduce Motion:** count-ups snap, confetti becomes a static gold card, springs become 200ms fades. Always honored.

## 8. Illustrations

**No illustration library, no mascots, no cartoon scenes.** The illustration language is **geometric glyph compositions**: a 64 Lucide icon at 1.5px stroke, `text/tertiary`, centered in a 96 `surface/slate` disc, with a small emerald accent shape (dot/ring) offset top-right. Used for empty states and interstitials. Football appears only as the ⚽ glyph in brand moments (splash, app icon). Team identity = initials discs in team colors, never crests we'd need licenses for.

## 9. Icons

**Lucide only.** Stroke 1.75 (24 grid), 2.0 at 16. Sizes: 16 inline · 20 rows · 24 nav/actions · 32 feature · 64 empty-state glyphs.

Mapping: wallet=wallet · send=arrow-up-right · receive=arrow-down-left · split=users · pool=trophy · party=tv · history=clock · QR=qr-code · AI=sparkles · security=shield-check · phrase=key-round · match=circle (ball) · map=map-pin · copy=copy · share=share-2 · success=check · pending=loader · error=alert-circle.

Rule: an icon never appears without a text label except in the tab bar and keypad.

## 10. Empty States

Pattern: glyph composition (see §8) + `title/card` one-liner + `caption` supporting line + one CTA (Primary or text button). Copy is warm, football-literate, never blames the user:

| Screen | Title | Support | CTA |
|---|---|---|---|
| Activity (new) | "Your matchday story starts here" | "Every payment will show up in this list." | Receive funds |
| Pools | "No open pools right now" | "Check back before kickoff — next match 7:30 PM." | See matches |
| Watch | "No parties near you yet" | "Be the hero who organizes one." | Host a party |
| Splits | "No splits yet" | "Next dinner's on you — to organize." | New split |
| Search (no results) | "No one found" | "Try a username, or share your QR instead." | Show my QR |
| Filtered list | "Nothing here" | "No pool payments yet — join one from Home." | Clear filter |
| Offline | "You're offline" | "Balances may be outdated. Money actions paused." | — (banner) |

## 11. Loading Screens

- **Rule of thumb:** content loads → skeleton; action processes → in-place button spinner; money signs → blocking sheet state. Never a full-screen spinner for content.
- **Skeletons** mirror the real layout exactly (hero block 200, action circles, card 96, 8 rows of 72) with shimmer §7.8 — screen never reflows when data lands.
- **Signing sequence (the one blocking state):** Confirm sheet locks; thumb → spinner; staged copy "Preparing… → Signing… → Broadcasting…" with a progress dot per stage; sheet not dismissible; cancel only during Preparing.
- **Wallet creation:** full-screen teaching loader — animated shield, staged copy ("Generating your keys… They never leave this device."), min 2s, progress implied not percented.
- **Faucet/incoming:** never blocks — an InsightChip "Your demo USDT is on the way ✨" until the realtime event lands.

## 12. Success Screens

Anatomy (always a sheet or full-screen takeover, matching the action's weight):

1. check-draw animation (§7.3) → 2. headline `title/screen` ("5 USDT sent to Alex") → 3. one-line receipt `caption` (fee · time) → 4. auto-dismiss 1200ms or `Done`.

Tiers:
- **Standard (send, split created, party joined):** sheet-level check + haptic; party join then morphs into the ticket card (§7.5).
- **Received (on Receive screen):** inline celebration — QR scales down 0.9, "+20 USDT received" slides in `text/positive`, single confetti-free pulse. The live-demo hero moment.
- **Jackpot (pool win):** full-screen takeover — grad/gold wash, confetti burst, "You won 25 USDT" with count-up, payout row already visible below, `Back to match` button. The only screen in the app that is loud, which is why it works.
- Failure twin: same anatomy, error glyph, headline states the guarantee first — "Your funds didn't move." Retry primary, Details text-button.

---

## Compliance checklist (design QA per screen)

☐ Only emerald is tappable ☐ gold only if something was won ☐ amounts tabular ☐ no shadow heavier than 35% ☐ one glass card max per viewport ☐ every list has its empty state ☐ every async control has its loading state ☐ Reduce Motion path exists ☐ football present in content, absent in chrome.
