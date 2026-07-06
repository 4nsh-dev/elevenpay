# ElevenPay Project Context

## One-Line Description

ElevenPay is an AI-native self-custodial USDT wallet for football fans.

## Product Idea

Football fans should be able to manage matchday payments in one wallet: receive funds, send money, join watch parties, enter prediction pools, split bills, and ask an AI assistant to prepare these actions.

The user always owns their funds. AI can suggest and prefill actions, but only the user can approve and only WDK can sign.

## Current Codebase Reality

The repository is a scaffold, not a complete wallet.

Implemented:

- Expo app shell
- Expo Router route structure
- Five-tab navigation
- Modal routes for send, receive, split, confirm, pool, and party
- Basic Home screen layout
- UI primitives
- Zustand stores
- Supabase client setup
- WDK service interface
- Copilot intent schema
- Strong design/product architecture docs

Not implemented:

- Real Supabase Auth
- Database migrations and RLS
- Generated Supabase types
- Native WDK worklet bundle generation
- Server-backed wallet registry
- Server-backed payment pipeline
- Server-backed transaction history
- Server-backed watch party flows
- Server-backed prediction pool flows
- Split bill flows
- AI copilot backend calls
- Realtime updates
- Tests

Recently added:

- Supabase email/password auth
- Persistent session bootstrap
- Protected routes
- Official WDK packages
- Device-local WDK wallet creation/restore/signing service
- SecureStore mnemonic persistence
- Wallet address, balance, receive QR, send draft, confirm signing, and local transaction history
- Send Money UI with recipient address, QR scan, amount validation, review handoff, WDK signing, broadcast success, and retryable failure states
- Watch Party browser/detail flow with dummy football data, participants, entry fee, WDK payment draft, and local broadcast-based ticket confirmation
- Prediction Pool browser/detail flow with dummy football data, winner pick, entry fee, prize pool, countdown, simulated result, and WDK-signed demo reward proof

## Important Existing Paths

- `app/` - Expo Router screens and modal routes
- `src/components/ui/` - reusable UI primitives
- `src/features/` - intended vertical slices, currently empty
- `src/services/wdk/` - custody boundary interface
- `src/services/supabase/` - Supabase client
- `src/services/copilot/` - AI intent schema/client placeholder
- `src/stores/` - local Zustand state
- `src/theme/tokens.ts` - design tokens
- `docs/` - detailed generated specifications

## Engineering Position

The next work should not be random screen-building. The project needs its backbone first:

1. Consolidated database/API contract
2. Supabase schema and types
3. Auth/session bootstrap
4. Native WDK worklet bundle resolution
5. Universal payment pipeline
6. Server-backed wallet registry/ledger
7. Football payment features
8. AI copilot

## Non-Negotiables

- No key material outside `src/services/wdk`.
- No AI-to-signing direct path.
- No client-side marking of transactions as successful.
- Amounts travel as decimal strings, not floats.
- `wallets.balance` is display cache only; the chain is truth.
- Root docs should reflect actual implementation state, not only planned features.
