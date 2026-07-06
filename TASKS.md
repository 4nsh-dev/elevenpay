# ElevenPay Development Roadmap

## Complete

- Expo project scaffold
- TypeScript config
- Expo Router app shell
- Root stack and modal routes
- Five-tab navigation
- Inter font loading
- NativeWind setup
- Design tokens
- Basic UI primitives
- Zustand stores for session, wallet metadata, and UI payment draft
- TanStack Query client
- Supabase client setup
- Supabase email/password authentication
- Persistent login bootstrap
- Protected routes
- Official WDK package installation
- Device-local WDK service boundary
- Wallet creation and restore through WDK seed handling
- SecureStore mnemonic persistence
- Wallet address display
- Receive QR
- Send Money flow with recipient address, QR scan, amount validation, review handoff, WDK signing, broadcast success, and retryable failure states
- Watch Party browser/detail flow with dummy football data, participants, entry fee, WDK payment draft, and local broadcast-based ticket confirmation
- Prediction Pool browser/detail flow with dummy football data, winner pick, entry fee, prize pool, countdown, simulated result, and WDK-signed demo reward proof
- Local transaction history
- WDK service interface
- Copilot intent schema
- Product/design/architecture docs

## Partially Complete

- Home dashboard: visual shell exists, real data missing
- Auth screens: login/signup/reset implemented; profile bootstrap awaits real database profiles
- Wallet screens: local WDK wallet flow exists; server registry/ledger still missing
- Confirm sheet: local WDK quote/sign/broadcast exists with clear success/failure states; server verification still missing
- Watch parties: local dummy data and WDK join flow exist; Supabase reservations/tickets still missing
- Prediction pools: local dummy data, entry payment, simulation, and WDK-signed reward proof exist; escrow/backend payout still missing
- Feature slices: folders exist, hooks/workflows missing
- Supabase integration: client exists, migrations/types/queries missing
- AI copilot: schema exists, backend call and UI missing
- Database design: detailed docs exist, but conflict between 7-table and 10-table versions

## Missing

- Supabase migrations
- RLS policies
- Seed data
- Generated Supabase `Database` type
- Supabase Auth OTP flow
- Session bootstrap/restore
- Profile creation/loading
- Native WDK worklet bundle generation is blocked by published bundler package missing `dist/cli.js`
- Supabase wallet registry
- Server-verified transaction ledger
- Transaction status verification edge function
- Transaction detail
- Universal server-backed payment pipeline
- Server-backed watch party reservations, tickets, and participant updates
- Server-backed prediction pool escrow, entries, results, and real payouts
- Split bill create/request/pay/settle
- Demo faucet
- Transaction verification edge function
- AI copilot edge function
- Realtime subscriptions
- Recovery phrase backup/reveal/verify
- Biometric approval flow
- Tests

## Recommended Build Order

### 1. Consolidate Contracts

- Choose the 10-table database design as source of truth.
- Update or retire conflicting docs.
- Define canonical TypeScript domain types for transaction status/type and payment drafts.

### 2. Supabase Backbone

- Add `supabase/` directory.
- Add migrations for tables, constraints, indexes, triggers, and RLS.
- Add seed data for demo matches, parties, pools, and demo users where appropriate.
- Generate `src/types/database.ts`.

### 3. Auth Foundation

- Implement email OTP sign-in.
- Restore Supabase session on app boot.
- Load/create profile row.
- Route by auth state and wallet presence.
- Implement logout.

### 4. WDK Foundation

- Resolve native WDK worklet bundler package issue.
- Generate `.wdk-bundle/wdk-worklet.bundle.js`.
- Move from JS-thread WDK service to official React Native worklet provider once bundle generation works.
- Keep all secret material inside `src/services/wdk` or WDK secure storage.

### 5. Universal Payment Pipeline

- Define strict `PaymentDraft` union.
- Create pending transaction rows with idempotency keys.
- Connect existing WDK quote/sign flow to pending transaction rows.
- Submit transaction hash to backend verification.
- Update domain rows only after verified success.

### 6. Wallet MVP

- Wallet tab with balance and transaction history.
- Receive modal with QR/address copy/share.
- Send modal with recipient, QR scan, amount, memo, review, confirm.
- Transaction detail sheet.

### 7. Demo Funding

- Implement `demo-faucet` edge function or equivalent demo funding path.
- Show non-blocking funding state after wallet creation.

### 8. Football Payment Workflows

- Watch party discovery and join payment.
- Prediction pool entry.
- Pool resolution and payout demo.
- Split bill creation and settlement.

### 9. AI Copilot

- Implement `ai-copilot` edge function.
- Implement `askCopilot`.
- Build AI tab/chat surface.
- Convert validated AI intents into normal payment/review flows.

### 10. Hardening And Demo Polish

- Realtime updates.
- Error/empty/loading states.
- Biometric threshold.
- Recovery phrase backup flow.
- Tests for money invariants.
- End-to-end demo script.

## Immediate Next Task

Start with contract consolidation and Supabase schema. Without that backbone, frontend payment screens would become throwaway mocks.
