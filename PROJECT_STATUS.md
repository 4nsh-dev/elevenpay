# ElevenPay — Project Status

_Last updated: 2026-07-08 (demo mode pass)_

## Feature snapshot

| Feature | Status | Notes |
| --- | --- | --- |
| Supabase backend foundation | ✅ Done | Migrations, RLS, typed client, seeds, repositories |
| Auth ↔ Supabase profiles | ✅ Done | Signup/login/logout wired to `profiles` |
| WDK wallet ↔ Supabase sync | ✅ Done | Address/balance registry; private keys never leave the device |
| Persistent transaction storage | ✅ Done | `recordAndBroadcast` pipeline, ledger + offline outbox |
| Watch parties | ✅ Done | Live boards, join + pay flow, `confirm_party_payment` RPC |
| Prediction pools | ✅ Done | Pools, entries, predictions, simulated payouts via RPC |
| Split bill | ✅ Done | Splits + shares schema, AI split, `confirm_split_payment` RPC |
| AI copilot | ✅ Done | Six-tool registry, deterministic planner (LLM-swappable), grounded context |
| Wallet recovery | ✅ Done | Reveal + verify phrase, backup reminders, secure confirmation, no DB storage |
| Demo mode | ✅ Done — this pass | Full sandbox: demo wallet/balance/transactions/parties/pools/payout/AI, one-click reset, zero production impact |

## This pass — Demo mode

- `src/stores/demo.ts` — demo flag + snapshot store (memory only, never persisted).
- `src/features/demo/fixtures.ts` — pristine sandbox snapshot: demo wallet, 250 USDT balance, 6 ledger rows, 2 watch parties, 2 open pools; all ids `demo-`prefixed, timestamps relative to now.
- `src/features/demo/index.ts` — enter/exit/reset, `runDemoPayout()`, and the getters behind the demo guards.
- `app/demo.tsx` — control screen: enter/exit, one-tap reset, payout demo, seeded-data overview.
- Demo guards added to `wallet-service.ts`, `watch-party-service.ts`, `prediction-pool-service.ts`, `transaction-storage.ts`, `copilot/context.ts`, `copilot/tools.ts` — each serves fixtures (or refuses payments) while demo is on; no Supabase or WDK access on any guarded path.
- `app/(tabs)/profile.tsx` — Demo mode entry row.
- Docs: `docs/demo-mode.md`.
- No new migrations, no new dependencies.

## Previous passes

1. **Supabase foundation** — schema migrations, RLS policies, typed client, seed data, repository layer.
2. **Auth ↔ profiles** — Supabase Auth with persistent sessions and profile rows.
3. **Wallet sync** — WDK wallet registered in Supabase (`docs/wallet-supabase-sync.md`).
4. **Transaction storage** — durable ledger with idempotency + offline outbox.
5. **Watch parties** — `docs/watch-party-supabase.md`.
6. **Prediction pools** — `docs/prediction-pools-supabase.md`.
7. **Split bill** — `docs/split-bill-supabase.md`.
8. **AI copilot** — `docs/ai-copilot.md`.
9. **Wallet recovery** — `docs/wallet-recovery.md`.
10. **Demo mode** — `docs/demo-mode.md` (this pass).

## Custody principles (unchanged)

- Private keys and mnemonics live only in device SecureStore; never in Supabase, never in auth state, never in AI context.
- The AI copilot prepares drafts only — every real transfer requires the user's explicit confirmation and device signing.
- Demo mode adds a third guarantee: while demo is on, payment paths are disabled entirely.
