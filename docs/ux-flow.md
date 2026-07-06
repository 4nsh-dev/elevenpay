# ElevenPay — Complete UX Flow

**Feel:** Revolut meets Apple Wallet. Dark glass, one action per screen, motion as feedback, no dead ends.

**Global patterns (apply to every flow):**

- **Universal Confirm Sheet** — every money movement ends in the same BottomSheet: recipient/purpose, amount, network fee, total, `Slide to Confirm` (or Confirm + Face ID above 10 USDT). What the sheet shows is exactly what WDK signs.
- **Loading** — skeleton shimmer for content (cards keep their glass shape), inline spinners inside buttons (button text → spinner, button stays same size), full-screen blocking only during signing/broadcast.
- **Success** — green check burst animation, haptic, then auto-dismiss (1.2s) back to origin screen with the new state already visible.
- **Errors** — inline and human ("Not enough USDT. You have 4.20."), never raw codes; every error keeps the user's input and offers one recovery action (Retry / Get demo USDT / Go back).
- **Empty states** — every list has an illustration-free, text+icon empty state with one CTA. No screen is ever blank.
- **Offline** — global slim banner "You're offline — balances may be outdated"; all money actions disabled with tooltip.

---

## 1. First Launch

**User goal:** understand what ElevenPay is in 5 seconds and get in.

**Screens:** Splash → Welcome.

- Splash: `ELEVENPAY ⚽ / The AI Wallet for Football Fans` fades in on charcoal, ball icon settles with a soft bounce. Auto-advance 1.5s.
- Welcome: 3-slide horizontal pager (Own your money · Pay with AI · Built for matchday), progress dots, `Continue` (primary) + `I have a wallet` (secondary, → Restore).

**Actions:** swipe pager, Continue → Authentication; I have a wallet → Restore flow (inside Wallet Creation).

**Edge cases:** returning user with session → skip straight to Home (biometric unlock); returning user, session expired → Sign In with email prefilled; app killed mid-onboarding → resume at Welcome, not Splash.

**Loading:** none (all local assets, pre-bundled fonts).
**Errors:** none possible; if fonts/assets fail, render system font — never block launch.
**Empty:** n/a.

## 2. Authentication

**User goal:** get in with as little friction as an email.

**Screens:** Sign In (email) → OTP Verify (6-digit) → [new user] Profile Basics (name, favorite team optional) → hand off to Wallet Creation.

**Actions:** enter email → `Send Code`; auto-focus OTP boxes, auto-submit on 6th digit; resend after 30s countdown; favorite team is a searchable chip grid, skippable.

**Edge cases:** wrong OTP 5× → 60s cooldown; email typo → "Edit email" link on OTP screen returns with input preserved; existing user signing in on new device → after OTP, route to Restore Wallet (their `wallets` row exists but this device has no keys); deep link opened while signed out → auth first, then continue to the deep link target.

**Loading:** `Send Code` button spinner; OTP verify inline spinner under boxes.
**Errors:** invalid email (inline, on blur); expired code ("Code expired — we sent a new one"); network fail → Retry keeps email.
**Empty:** n/a.

## 3. Wallet Creation

**User goal:** get a real self-custodial wallet without understanding crypto.

**Screens:** Creating Wallet (auto) → Wallet Ready → [optional now, nagged later] Backup Recovery Phrase → Home.

- Creating Wallet: full-screen, animated shield + progress copy that teaches while it works: "Generating your keys… They never leave this device." (WDK keygen + SecureStore + register address + faucet request run behind this.)
- Wallet Ready: address (shortened, tap to copy), confetti-free (save confetti for wins), `Back up now` (primary) / `Later` (secondary).
- Backup: recovery phrase flow (see §12) in "first-time" mode; skipping sets a persistent amber "Wallet not backed up" chip on Profile and a Home banner after 24h.

**Actions:** none required until Ready — creation is fully automatic after auth. Restore path: `I have a wallet` → 12-word input (paste-friendly, per-word chips, word-list autocomplete) → validate → Home.

**Edge cases:** faucet slow/down → proceed to Home with 0 balance + AI insight card "Your demo USDT is on the way"; keygen fails (rare) → Retry, keys are regenerated (nothing was persisted); user already has wallet on this device → skip entirely; restore with valid-but-wrong phrase → wallet restores with 0 history, show "This looks like a different wallet" with support hint; SecureStore/biometric unavailable (no passcode set on device) → explain and require device passcode before continuing (hard requirement, custody depends on it).

**Loading:** the Creating screen IS the loading state (min 2s so the copy is readable, max real time).
**Errors:** restore — invalid word highlighted in red at the word, checksum failure message after word 12, never clears input.
**Empty:** n/a.

## 4. Home Dashboard

**User goal:** see money + what to do next, in one glance.

**Screens:** Home (single scroll): greeting hero (Good Evening 👋 / name / World Cup Wallet / balance counts up) → 4 ActionButtons (Send · Receive · Split · Pool) → Today's Match card (teams, countdown, `Join Pool`) → AI Insight card (✨) → Recent activity (last 3 tx, `See all`).

**Actions:** tap balance → Wallet tab; action buttons → respective modals; match card → Pool detail; insight card → relevant flow (insights are deep-link-shaped: "Split last night's dinner?" → Split flow prefilled); pull-to-refresh → balance re-fetch from chain + feed refresh; floating AI button (bottom-right, above tab bar) → AI conversational mode.

**Edge cases:** balance changed while app backgrounded → count-up animates from old to new on resume; no upcoming match → match card swaps to "Explore watch parties" card; multiple matches → horizontally swipeable match cards; brand-new user (0 tx) → activity section shows empty state.

**Loading:** skeleton hero + skeleton cards on first load; subsequent loads render cached instantly, refresh silently.
**Errors:** balance fetch fail → show cached balance with subtle "as of 10:32" timestamp, never show 0 for a funded wallet.
**Empty:** activity: "No payments yet — receive your demo USDT to get started → Receive."

## 5. Send Money

**User goal:** money to a person in under 10 seconds.

**Screens:** Send (modal): Recipient → Amount → Review (Confirm Sheet) → Success.

- Recipient: search (name from users, or paste address), recent recipients as avatar row, QR scan icon.
- Amount: big numeric keypad, USDT suffix, balance shown ("Available: 58.42"), memo field (optional, "For the kebabs 🌯"), quick chips (5 / 10 / 25 / Max).
- Review: universal Confirm Sheet.
- Success: green check, "5 USDT sent to Alex", `Done`.

**Actions:** pick/scan/paste recipient → enter amount → Review → slide to confirm (+Face ID if >10) → Done. AI path: "Send 5 USDT to Alex" in copilot → lands directly on Review with everything prefilled.

**Edge cases:** amount > balance → keypad still works, Continue disabled, inline "Not enough USDT" + `Get demo USDT` shortcut; self-send → blocked with a wink ("That's you 👋"); invalid/malformed address on paste → inline error before amount screen; fee makes total exceed balance → suggested Max auto-accounts for fee; recipient has no ElevenPay account but valid address → allowed, shown as shortened address with warning "Not an ElevenPay user — double-check the address."

**Loading:** Review sheet shows fee estimate skeleton (~1s); after confirm, sheet locks with "Signing… Broadcasting…" progress states (WDK), never dismissible mid-sign.
**Errors:** broadcast fail → sheet turns error state "Transaction didn't go through — your funds didn't move", Retry re-signs; timeout with unknown status → "Taking longer than usual", move tx to PENDING in history rather than blocking the user.
**Empty:** no recents → recipient screen leads with QR scan and address paste.

## 6. Receive Money

**User goal:** get paid with zero explanation.

**Screens:** Receive (modal): large QR (address encoded), shortened address, `Copy` / `Share`, "Works with any USDT wallet" caption.

**Actions:** copy (haptic + "Copied" toast + clipboard auto-clear after 60s), share sheet, optional `Request amount` toggle → adds amount to QR payload and generates a shareable payment link.

**Edge cases:** incoming payment while screen open → realtime event → QR screen celebrates inline ("+20 USDT received") with the success animation — this is a killer demo moment; screenshot taken → fine (it's a public address), no warning needed.

**Loading:** QR renders instantly from cached address; never a spinner here.
**Errors:** none (fully local); share sheet cancel is silent.
**Empty:** n/a.

## 7. Transaction History

**User goal:** trust — see every movement, understand each one.

**Screens:** Wallet tab → full History (list, grouped by day) → Transaction Detail (bottom sheet).

- Row: icon by type (⚽ party, 🏆 pool, 🍽 split via Lucide equivalents), counterparty, memo, signed amount (+green / −white), status dot if PENDING.
- Detail sheet: amount, type, counterparty, memo, fee, timestamp, status timeline (Created → Broadcast → Confirmed), `View on explorer` link, tx hash (copyable).

**Actions:** filter chips (All · Sent · Received · Pools · Parties · Splits), search by name/memo, tap row → detail, pull-to-refresh.

**Edge cases:** PENDING tx confirms while list open → row status animates to confirmed, balance count-up ticks; FAILED tx → red accent row with "Funds didn't move" in detail; very long memo → truncate row, full in detail.

**Loading:** 8 skeleton rows on first load; pagination (infinite scroll) with bottom spinner.
**Errors:** fetch fail with cache → show cache + offline banner; fetch fail cold → full-screen retry state.
**Empty:** "Your matchday story starts here — every payment will show up in this list." + `Receive funds` CTA. Filtered-empty: "No pool payments yet — join one from Home."

## 8. Prediction Pool

**User goal:** put 2 USDT on my team and feel the sweat.

**Screens:** Pool Detail → Pick Team → Confirm Sheet → In-Pool (live) → Result (win/lose).

- Detail: big match card (team A vs team B), prize pool (counts up live via realtime), entry fee, countdown to close, participant avatars, AI nudge ("Pool closes in 15 minutes").
- Pick: two large team buttons (tap = select, selected glows emerald), `Enter Pool — 2 USDT`.
- In-Pool: your pick locked with a badge, live prize total, "Waiting for kickoff" → LIVE state with simulated match status.
- Result: winner → full-screen gold confetti + "You won 25 USDT" + payout tx auto-appears; loser → graceful "Not this time — Brazil took it" with prize destination shown (transparency).

**Actions:** pick team → confirm (pipeline) → watch live → [demo: organizer triggers resolve] → payout lands via realtime.

**Edge cases:** pool closes while user is on Pick screen → buttons disable, "Pool just closed" state with `See other pools`; user already entered → Detail shows their pick, no re-entry (predictions are final — stated upfront); pool at 0 participants → "Be the first in" framing; entry fee > balance → same insufficient-funds pattern as Send; two rapid taps on Enter → idempotent, one prediction (client guard + unique constraint pool_id+user_id).

**Loading:** prize/participants skeleton; after confirm, standard signing states; Result screen never loads — it's pushed by realtime.
**Errors:** payment succeeds but prediction insert fails (rare split-brain) → auto-retry insert; if still failing, show "Your entry is being recorded" and reconcile server-side — never leave a paid user looking un-entered.
**Empty:** Pools list: "No open pools — check back before the next match" + next match time.

## 9. Watch Party

**User goal:** find where to watch and lock a seat by paying.

**Screens:** Watch tab (list) → Party Detail → Confirm Sheet → Joined state.

- List: PartyCards — title, venue, city + distance, fee, seats left, match badge.
- Detail: hero card, map snippet, organizer avatar, attendee avatars + count, AI nudge ("This event still has 12 seats"), `Join — 5 USDT`.
- Joined: card expands (the signature animation), ticket-style membership card with QR (member id) for door check-in, `Add to calendar`.

**Actions:** browse/filter by city → detail → join (pipeline: membership PENDING → pay → PAID) → joined state; share party link.

**Edge cases:** party fills while viewing → Join disables live ("Sold out"), realtime seat count; payment succeeds at the exact moment party fills → membership honored (seat was reserved PENDING at tap-time, reservation expires in 3 min if unpaid); user is organizer → Detail shows attendee list + `Manage` instead of Join; event in the past → card moves to "Past" section, un-joinable; user already joined → detail opens on ticket view.

**Loading:** list skeleton cards; seat count and avatars stream in.
**Errors:** pay fail after reservation → reservation released with "Your seat was held — try again" retry inside 3-min window.
**Empty:** Watch tab: "No parties near you yet — be the hero: `Host a party`" (host flow is post-MVP; button opens a 'coming soon' sheet in the demo, or hides).

## 10. Bill Splitting

**User goal:** dinner's 100, three friends, zero awkwardness.

**Screens:** Split (modal): Bill Amount → Friends → Review Split → Requests Sent → (each friend: request → pay → settle).

- Amount: same big keypad ("What was the total?"), optional memo + receipt photo (post-MVP).
- Friends: search + recent avatars, multi-select chips; payer included/excluded toggle ("I paid — split among 3 friends" vs "including me").
- Review: AI line does the math — "Everyone pays 25 USDT"; per-person editable amounts (must sum to total, live validation); `Create Requests`.
- Sent: list of friends with status chips (Requested → Paid), progress ring "1 of 3 paid".

**Actions:** enter amount → pick friends → adjust shares if uneven → create requests (writes SPLIT_BILL request rows; each friend gets a notification deep-linking to a prefilled Send flow) → track settlement live. AI path: "Split 100 between Alex, John and Emma" → lands on Review prefilled.

**Edge cases:** uneven edit that doesn't sum → Continue disabled, delta shown ("2 USDT unassigned"); friend without ElevenPay → their share becomes a shareable payment link instead of an in-app request; a friend disputes/ignores → requester can `Remind` (once per 24h) or `Cancel` that leg; requester includes self → self-leg auto-marked settled (no self-payment).

**Loading:** creating requests: button spinner → sequential check animation per friend.
**Errors:** request creation partial fail → per-friend retry chips, successes preserved.
**Empty:** no friends yet → "Add friends by QR or invite link" CTA on Friends step. Splits list empty: "No splits yet — the next dinner's on you (to organize)."

## 11. Profile

**User goal:** control — identity, keys, exits.

**Screens:** Profile tab: avatar + name + favorite team badge → Wallet Address row (copy) → Recovery Phrase row (chevron, amber "Not backed up" chip if skipped) → Security row (Face ID toggle, auto-lock timing, confirm-threshold amount) → About (version, WDK/testnet notice, licenses) → Log Out (destructive style, bottom).

**Actions:** edit avatar (camera/library → Supabase storage), edit name, change favorite team; toggle biometrics (re-auth to change); copy address.

**Edge cases:** avatar upload fail → keep old, toast retry; biometrics toggled off → warn that any-amount sends will need passcode confirm instead; favorite team change → home match cards re-prioritize.

**Loading:** avatar upload progress ring on the avatar itself.
**Errors:** inline toasts; profile never blocks on network (edits are optimistic, reconciled).
**Empty:** no avatar → initials on emerald disc (Avatar component default).

## 12. Recovery Phrase

**User goal:** back up the wallet without leaking it.

**Screens:** Warning Gate → Biometric check → Reveal → Verify (first-time only) → Done.

- Warning: "Anyone with these 12 words owns your money. Never share them. ElevenPay support will never ask." `I understand` (3s enabled-delay).
- Reveal: 12 numbered word chips, blurred until `Hold to reveal` is pressed (words visible only while holding); screenshot blocked (Android FLAG_SECURE) / screenshot-detected warning (iOS); no copy button — deliberate.
- Verify: "Tap word #3, #7, #11" from shuffled chips → success → backed-up flag set, amber chips clear everywhere.

**Actions:** hold-to-reveal, complete verify. Re-entry later (already backed up): Warning → biometric → Reveal only.

**Edge cases:** verify failed 3× → back to Reveal ("Take your time — write them down"); biometric fail/cancel → dismiss, nothing revealed; app backgrounded while revealed → words instantly re-blur (privacy screen also masks app switcher).

**Loading:** none — phrase is decrypted locally, instant after biometric.
**Errors:** biometric hardware error → offer device passcode fallback.
**Empty:** n/a.

## 13. Logout

**User goal:** leave safely — without accidentally destroying access to money.

**Screens:** Confirm dialog → [if not backed up: hard interstitial] → Signed out (Welcome).

- Confirm: "Log out of ElevenPay?" — copy explains: "Your wallet keys stay on this device" with `Log out` / `Cancel`.
- Not-backed-up interstitial (the one aggressive moment in the app, earned): "⚠️ Your recovery phrase isn't backed up. If you lose this device, you lose your funds. Back up first?" → `Back up now` (primary) / `Log out anyway` (destructive, 3s delay).

**Actions:** logout clears Supabase session + Zustand stores + query cache. **Keys remain in SecureStore** (logout ≠ wallet deletion). Separate `Remove wallet from device` action lives inside Security, gated by phrase-backup confirmation + typing "REMOVE".

**Edge cases:** logout offline → allowed (local session clear), server session expires naturally; sign back in same device → wallet auto-reconnects from SecureStore, no restore needed (delightful); different account signs in on same device → that account's `wallets.wallet_address` mismatch detected → keys kept namespaced per user id, never cross-wired.

**Loading:** brief spinner on Log out button.
**Errors:** server signout fail → still clear locally, session token discarded.
**Empty:** n/a.

---

## Flow map (how everything connects)

```
Splash → Welcome → Auth (OTP) → Wallet Creation → HOME
                                      ↑ restore
HOME ─ Send ─ Confirm Sheet ─ Success ─ back to HOME
     ─ Receive (QR) ─ live "received" celebration
     ─ Split → Requests → friends' Send flows
     ─ Pool → Pick → Confirm → LIVE → Result (confetti) → payout in History
     ─ Watch → Party → Confirm → Ticket
     ─ AI (floating/tab) → any of the above, prefilled at Review
Wallet tab → History → Detail sheet → explorer
Profile → Recovery Phrase / Security / Logout
```

The demo story walks this map left to right in one continuous run: create → receive → party → pool → win → split → history.
