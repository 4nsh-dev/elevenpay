# ElevenPay — Technical Architecture

**Stack:** React Native (Expo, TypeScript) · Tether WDK (on-device custody) · Supabase (Auth, Postgres, Realtime, Edge Functions) · OpenAI (Copilot, server-side)

**Prime directive:** the AI proposes, the user approves, WDK signs, Supabase records. Keys never leave the device; the AI and the backend never touch funds.

---

## 1. High-Level System Diagram

```
┌─────────────────────────── DEVICE ───────────────────────────┐
│  Expo React Native app                                       │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ UI Layer   │→ │ Feature Layer│→ │ Service Layer        │  │
│  │ (screens,  │  │ (wallet,     │  │ ┌──────────────────┐ │  │
│  │  components│  │  payments,   │  │ │ WdkService       │←── SecureStore/
│  │  theme)    │  │  pools, ai)  │  │ │ (keys, signing)  │ │  Keychain (keys)
│  └────────────┘  └──────────────┘  │ ├──────────────────┤ │  │
│                                    │ │ SupabaseClient   │ │  │
│                                    │ ├──────────────────┤ │  │
│                                    │ │ CopilotClient    │ │  │
│                                    │ └──────────────────┘ │  │
└────────────────────────────────────┼──────────┬───────────┘
                     signed tx       │          │ HTTPS / WSS
                          ↓          │          ↓
                  ┌──────────────┐   │   ┌─────────────────────────┐
                  │  Blockchain  │   │   │ Supabase                │
                  │  (USDT       │   │   │  Auth · Postgres (RLS)  │
                  │   testnet)   │   │   │  Realtime · Storage     │
                  └──────────────┘   │   │  Edge Functions:        │
                                     │   │   ai-copilot (OpenAI)   │
                                     │   │   resolve-pool          │
                                     │   │   demo-faucet           │
                                     │   └─────────────────────────┘
```

Three planes:

- **Money plane** — device-only. WDK generates/stores keys, builds, signs, and broadcasts transactions directly to the chain.
- **Coordination plane** — Supabase. Who joined what, who owes whom, pool state, transaction metadata (hash, type, status).
- **Intelligence plane** — OpenAI behind a Supabase Edge Function. Reads coordination data, emits *intents*, never keys, never signatures.

## 2. Folder Structure

```
elevenpay/
├── app/                          # Expo Router — routes only, no logic
│   ├── (auth)/
│   │   ├── welcome.tsx           # animated splash → Continue
│   │   ├── sign-in.tsx
│   │   └── create-wallet.tsx     # WDK onboarding + recovery phrase
│   ├── (tabs)/
│   │   ├── index.tsx             # Home — AI Wallet Dashboard
│   │   ├── wallet.tsx
│   │   ├── watch.tsx             # watch parties
│   │   ├── ai.tsx                # conversational copilot
│   │   └── profile.tsx
│   ├── send.tsx                  # modal flows
│   ├── receive.tsx
│   ├── split.tsx
│   ├── pool/[id].tsx
│   ├── party/[id].tsx
│   └── confirm.tsx               # universal transaction approval sheet
├── src/
│   ├── components/
│   │   ├── ui/                   # GlassCard, PrimaryButton, SecondaryButton,
│   │   │                         # ActionButton, BottomSheet, Avatar, CountUp
│   │   ├── wallet/               # WalletCard, TransactionCard, QRCode
│   │   ├── football/             # MatchCard, PoolCard, PartyCard, Countdown
│   │   └── ai/                   # AIMessage, UserMessage, InsightChip, FloatingAIButton
│   ├── features/                 # vertical slices — hooks + logic per domain
│   │   ├── auth/
│   │   ├── wallet/
│   │   ├── payments/             # intent → unsigned tx → confirm → sign → record
│   │   ├── watch-party/
│   │   ├── prediction-pool/
│   │   ├── split-bill/
│   │   └── copilot/
│   ├── services/
│   │   ├── wdk/                  # WdkService — ONLY module that touches keys
│   │   ├── supabase/             # client, typed queries, realtime subscriptions
│   │   └── copilot/              # edge-function client, intent schema, guards
│   ├── stores/                   # Zustand: session, wallet, ui
│   ├── hooks/                    # useBalance, useTransactions, usePool, ...
│   ├── theme/                    # tokens.ts (colors, radii, spacing), typography
│   ├── lib/                      # formatting, validation, constants
│   └── types/                    # DB row types, Intent types, WDK wrappers
├── supabase/
│   ├── migrations/               # 7-table schema + RLS policies + indexes
│   ├── functions/
│   │   ├── ai-copilot/           # OpenAI proxy + tool-calling → Intent JSON
│   │   ├── resolve-pool/         # simulate result, mark winners
│   │   └── demo-faucet/          # sends demo USDT to new wallets
│   └── seed.sql                  # demo matches, parties, pools
├── docs/                         # PRD, design system, schema, this file
├── .env.example
└── app.json
```

Rules: routes contain no business logic; features never import each other's internals (only via services/stores); `services/wdk` is the single custody boundary.

## 3. Feature Architecture

Every payment feature is the same five-step pipeline with a different intent type:

```
Intent (AI or user tap)
  → Prepare (feature builds PaymentDraft: to, amount, type, memo, context)
    → Approve (universal confirm.tsx sheet — human tap, biometric gate)
      → Sign & broadcast (WdkService)
        → Record (insert transactions row + domain row; realtime fans out)
```

| Feature | Intent type | Domain writes |
|---|---|---|
| Send | SEND | transactions |
| Watch party | WATCH_PARTY | watch_party_members (PENDING→PAID) + transactions |
| Pool entry | POOL_ENTRY | predictions + transactions; prize_pool increments (trigger) |
| Pool payout | POOL_REWARD | resolve-pool sets winner; payout tx recorded |
| Split bill | SPLIT_BILL | N transactions (one per friend request) |
| Tip | TIP | transactions |

One pipeline means one confirm sheet, one signing path, one audit trail — and the demo story is just this pipeline run six ways.

## 4. Frontend Architecture

- **Expo Router** with a five-tab layout (Home, Wallet, Watch, AI, Profile); flows (send/receive/split/pool/confirm) are modals over the tabs so context is never lost.
- **Design tokens** in `theme/tokens.ts` mirror the design system exactly (bg `#0B0F14`, card `#161B22`, primary `#00C853`, accent gold `#FFD54F` reserved for wins; radii 24/18/16; 8-pt spacing; Inter; Lucide icons). Components consume tokens only — no hard-coded colors.
- **GlassCard** is the base surface primitive; WalletCard/MatchCard/PoolCard/TransactionCard compose it.
- **Animations:** Reanimated for count-up balance, slide-in transactions, expanding pool cards; Lottie (or Reanimated) for the success check and win confetti; Moti-style fade for the splash.
- **Rendering discipline:** screens are thin — data comes from feature hooks (`useWallet()`, `usePool(id)`), UI state from Zustand, server state from TanStack Query.

## 5. Backend Architecture (Supabase)

- **Auth** — email OTP / social login. `auth.users.id` is the `users.id` everywhere.
- **Postgres** — the 7-table schema (users, wallets, transactions, watch_parties, watch_party_members, prediction_pools, predictions) with RLS on every table.
- **Realtime** — channels on `prediction_pools`, `predictions`, `watch_party_members`, `transactions` so pool prize totals, seat counts, and incoming payments update live during the demo.
- **Edge Functions** (Deno, service-role key, the only privileged code):
  - `ai-copilot` — holds `OPENAI_KEY`; receives user message + wallet context, calls OpenAI with tool definitions, returns a validated **Intent JSON** (never executes anything).
  - `resolve-pool` — demo referee: sets `winner_team`, flags `is_winner`, flips pool to FINISHED, triggers the payout flow.
  - `demo-faucet` — funds new wallets with demo USDT and records the RECEIVE transaction (this is also the pragmatic demo treasury that signs POOL_REWARD payouts — an explicitly documented demo-only custody exception, since a real pool payout needs an escrow contract).
- **Storage** — `avatars/` bucket.

## 6. Database Architecture

Schema as specified in `database-schema.md`, plus:

- **Indexes:** `wallets(user_id)`, `wallets(wallet_address)`, `transactions(sender_wallet, created_at)`, `transactions(receiver_wallet, created_at)`, `predictions(pool_id)`, `watch_party_members(watch_party_id)`, `prediction_pools(status)`.
- **Trigger:** on `predictions` insert → `prize_pool += entry_fee` (keeps the pool card live without client math).
- **`wallets.balance` is a display cache only.** Source of truth is the chain via WDK; the app refreshes the cache after every confirmed tx and on pull-to-refresh. Nothing ever computes from it.
- **`transactions.status` state machine:** PENDING → BROADCAST → SUCCESS | FAILED, keyed to `transaction_hash` confirmations.
- **RLS:** owner-only read/update on wallets, transactions (sender or receiver), predictions, memberships; public read on watch_parties and prediction_pools; all writes that matter go through user-owned rows or Edge Functions.

## 7. State Management

Three kinds of state, three tools — never mixed:

1. **Server state → TanStack Query.** Transactions, parties, pools, profile. Query keys per domain (`['pool', id]`), invalidated by Realtime events and after pipeline step 5. Optimistic updates for joins (membership appears instantly as PENDING).
2. **Client state → Zustand.** `sessionStore` (auth/user), `walletStore` (address, cached balance, wallet lock status — never keys), `uiStore` (active bottom sheet, copilot open, pending PaymentDraft).
3. **Secret state → SecureStore/Keychain only.** Mnemonic and derived keys live exclusively inside `WdkService`; no store, no query cache, no log ever holds them.

The **PaymentDraft** in `uiStore` is the handoff object between AI/taps and the confirm sheet — it holds everything *except* a signature.

## 8. API Communication

- **CRUD:** supabase-js (PostgREST) with generated TypeScript row types — no hand-rolled REST layer.
- **Privileged ops:** `supabase.functions.invoke()` for `ai-copilot`, `resolve-pool`, `demo-faucet`, authenticated by the user's JWT.
- **Live updates:** Realtime channel subscriptions feeding Query invalidation.
- **Chain:** WDK talks to the blockchain directly from the device (RPC via WDK's providers). The backend never brokers chain traffic.
- **Contract:** one shared `Intent` discriminated union (`type: SEND | WATCH_PARTY | POOL_ENTRY | SPLIT_BILL | TIP`, amount, recipient(s), refs) validated with Zod on both the edge function output and the client input — the AI cannot emit a shape the app didn't already agree to.

## 9. AI Integration (Copilot)

Three surfaces, one brain:

1. **Dashboard insights** — periodic summarization of the user's transactions ("You spent 12 USDT on football this week"), generated by `ai-copilot` from RLS-scoped data.
2. **Contextual nudges** — mostly *deterministic* rules dressed in the AI voice (pool closes in 15 min, 12 seats left, each friend owes 8 USDT). Cheap, reliable, demo-proof; the LLM is reserved for language, not arithmetic.
3. **Conversational mode** — the AI tab + floating button. OpenAI tool-calling with tools: `prepare_send`, `prepare_split`, `prepare_pool_entry`, `prepare_party_join`, `get_spending_summary`. Tool output = Intent JSON → client builds a PaymentDraft → confirm sheet.

Guardrails:
- OpenAI key lives only in the edge function.
- The model receives balances and history summaries, never addresses' private material (there is none server-side to leak).
- Every AI-emitted intent is Zod-validated, amount-capped, and **always** lands on the confirm sheet. There is no code path from model output to `WdkService.sign()` without a user tap.

## 10. WDK Integration

`WdkService` — a singleton wrapper, the only module importing WDK:

- `createWallet()` — generate mnemonic on device → persist to SecureStore (iOS Keychain / Android Keystore, biometric-gated) → derive USDT account → register public address in `wallets`.
- `restoreWallet(mnemonic)` — recovery flow.
- `getBalance()` — chain read; refreshes the DB display cache.
- `prepareTransfer(draft)` — unsigned tx + fee estimate for the confirm sheet.
- `signAndBroadcast(tx)` — biometric prompt → sign → broadcast → return hash.
- `revealRecoveryPhrase()` — biometric-gated, Profile → Recovery Phrase, with screenshot warning.

Network: a WDK-supported USDT testnet, with the `demo-faucet` seeding new wallets so the demo never stalls on funding. `wallets.blockchain` keeps us honest about multi-chain later.

## 11. Security Architecture

- **Custody:** keys generated and stored on-device only; DB stores addresses. Enforced by module boundary (only `services/wdk` links WDK) and code review.
- **Approval invariant:** AI recommends → user approves (explicit tap + biometrics above a threshold) → WDK signs. The confirm sheet renders exactly what will be signed: recipient, amount, fee, purpose.
- **RLS everywhere;** the anon key is safe to ship because policies are the actual perimeter. Service-role key exists only in edge functions.
- **AI containment:** server-side key, schema-validated output, amount caps, no signing path.
- **Transport & secrets:** HTTPS/WSS only; `.env` never committed; separate Supabase projects for dev/demo.
- **App hardening:** no mnemonic in logs/analytics/crash reports; clipboard cleared after address copy; recovery-phrase screen blocks screenshots where the OS allows.
- **Known demo exceptions (documented, not hidden):** faucet/treasury wallet custodies the demo pool payout; match results are simulated by `resolve-pool`. Production would replace these with an escrow contract and a results oracle.

## 12. Scalability

- **Vertical-slice features + the single payment pipeline** mean each new payment type (tickets, merch, creator subscriptions) is a new Intent variant + domain table, not a new architecture.
- **Chain abstraction** via `wallets.blockchain` and WDK's multi-chain support → add chains without schema change.
- **Realtime + triggers** already handle fan-out; at scale, move pool settlement to escrow smart contracts and add a queue (pg_cron / worker) for payouts.
- **The Intent schema is the API** — the same contract can later serve a web app, notifications-driven flows, or agentic automations without touching the custody layer.
- **Multi-tournament:** matches/tournaments become data (a `matches` table feeding MatchCard and pools) — the UI already treats football as content, not chrome.
