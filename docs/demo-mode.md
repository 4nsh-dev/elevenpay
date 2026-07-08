# Demo Mode

A self-contained sandbox of ElevenPay: one tap seeds a demo wallet, balance,
transactions, watch parties, prediction pools, and an AI copilot grounded in
all of it — with zero production impact.

## Entry points

- **Profile tab → Demo mode** row opens the control screen at `/demo`.
- `app/demo.tsx` — enter/exit, one-tap reset, the payout demo, and a live
  overview of the seeded data.

## How it works

| Piece | File | Role |
| --- | --- | --- |
| Flag + snapshot store | `src/stores/demo.ts` | Zustand store holding `isDemoMode` and the demo snapshot. **Memory only** — never persisted, so an app restart always exits demo. |
| Fixtures | `src/features/demo/fixtures.ts` | `buildDemoSnapshot()` returns a pristine snapshot: demo wallet address, 250 USDT balance, 6 ledger rows across a week, 2 watch parties, 2 open pools. Timestamps are relative to now so the demo always looks fresh. All ids are `demo-`prefixed. |
| Demo API | `src/features/demo/index.ts` | `enterDemoMode` / `exitDemoMode` / `resetDemoMode` / `runDemoPayout` plus the data getters used by the guarded production paths. |

### Guarded production paths

Each data layer short-circuits to fixtures while the flag is on:

- `wallet-service.ts` — `hydrateWallet`/`refreshWallet` apply the demo wallet,
  balance, and ledger to the stores and return before any WDK or Supabase call.
- `watch-party-service.ts` — `listParties` / `getPartyDetail` serve fixtures;
  `beginJoinParty` confirms the seat **locally** (no RPC, no payment draft).
- `prediction-pool-service.ts` — `listPools` / `getPoolDetail` serve fixtures;
  `beginEnterPool` and `simulatePool` refuse with a friendly demo message
  pointing at the Demo screen payout button (`friendlyPoolError` renders
  `DEMO:`-prefixed messages verbatim).
- `transaction-storage.ts` — `loadLedger` fills the transactions store from
  fixtures and skips the outbox flush and all Supabase queries.
- `copilot/context.ts` + `copilot/tools.ts` — the AI context (wallet, balance,
  recent transactions, parties, pools) is built from the snapshot; explain/
  summarize read the demo ledger; transfer and split drafts are disabled with
  a clear validation message so nothing real can be prepared.

### Payout demo

`runDemoPayout()` (button on the Demo screen) settles the featured pool in one
tap: marks Arsenal as winner (`FINISHED`), appends a `POOL_REWARD` row to the
demo ledger, and credits 12 USDT to the demo balance — a pure in-memory store
mutation. It runs once per seed; **Reset demo** re-arms it.

### One-click reset

**Reset demo** calls `resetDemoMode()`, which rebuilds the pristine fixture
snapshot and re-applies it to the stores — joins, payouts, and balance changes
all vanish in a single tap.

## No production impact — guarantees

- **No Supabase writes or reads** happen from any demo-guarded path.
- **WDK custody is never touched**: no key access, no signing, no device
  transaction history writes.
- **Payments are impossible in demo**: party joins are local, pool entries and
  copilot transfer/split drafts refuse before a `PaymentDraft` can exist.
- **Nothing is persisted**: the snapshot lives in a non-persisted Zustand
  store; exit (or restart) drops it and `refreshWallet` re-hydrates the real
  wallet, which demo never modified.
- **No id collisions**: every demo entity id is prefixed with `demo-`.

## Known limitations

- Screens that loaded data before toggling demo may show stale lists until
  they remount or reload (e.g. revisit the Watch tab after entering demo).
- The wallet tab's on-chain history preview falls back to its built-in sample
  history in demo (the WDK device history is deliberately not faked); the
  ledger-backed history and AI answers use the demo transactions.
- Demo state is per-session by design — closing the app exits demo.
