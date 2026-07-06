# ElevenPay Architecture

## System Shape

ElevenPay has three planes:

1. Money plane: WDK on the device creates wallets, stores secrets, prepares transfers, signs, and broadcasts.
2. Coordination plane: Supabase Auth/Postgres/RLS/Realtime stores public metadata, domain state, and transaction records.
3. Intelligence plane: AI copilot prepares structured intents and explanations, but never executes.

## Frontend

Framework:

- Expo React Native
- Expo Router
- NativeWind
- Zustand
- TanStack Query

Current app routes:

- `app/(auth)/welcome.tsx`
- `app/(auth)/sign-in.tsx`
- `app/(auth)/create-wallet.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/wallet.tsx`
- `app/(tabs)/watch.tsx`
- `app/(tabs)/ai.tsx`
- `app/(tabs)/profile.tsx`
- `app/send.tsx`
- `app/receive.tsx`
- `app/split.tsx`
- `app/confirm.tsx`
- `app/pool/[id].tsx`
- `app/party/[id].tsx`

Routes should stay thin. Business logic should move into feature hooks and services.

## Feature Slices

Intended domains:

- `auth`
- `wallet`
- `payments`
- `watch-party`
- `prediction-pool`
- `split-bill`
- `copilot`

These folders currently exist but are mostly empty. They should become the main home for workflows.

## Services

### WDK Service

`src/services/wdk` is the only module allowed to touch WDK, mnemonics, keys, signing, or secure storage.

Public interface should expose only safe operations:

- has wallet
- create wallet
- restore wallet
- get address
- get balance
- prepare transfer
- sign and broadcast
- reveal recovery phrase behind biometric gate
- remove wallet from device

### Supabase Service

`src/services/supabase` owns the Supabase client. Feature modules should use typed query/mutation helpers built on top of it.

### Copilot Service

`src/services/copilot` validates AI intent shapes and should call the Supabase edge function. The model output must be parsed and validated before it can prefill a flow.

## State Management

Use three separate state categories:

- Server state: TanStack Query
- Client UI/session metadata: Zustand
- Secret state: WDK/SecureStore only

Never put key material in Zustand or Query cache.

## Universal Payment Pipeline

Every money movement should follow one path:

1. Intent: user tap or AI intent
2. Prepare: build a typed payment draft
3. Record pending: create pending transaction/domain state
4. Approve: universal confirm sheet
5. Prepare transfer: WDK fee estimate/unsigned transaction
6. Sign and broadcast: WDK with user approval/biometric gate
7. Submit hash: backend verifies
8. Record result: Supabase updates transaction and domain rows
9. Refresh/realtime: UI updates

There should be no feature-specific signing paths.

## AI Guardrails

- AI receives context summaries, not secrets.
- AI returns structured intents, not executable operations.
- Client validates AI intents with Zod.
- AI intents must land in normal review/confirm flows.
- No code path may call `signAndBroadcast` from AI output without explicit user approval.

## Current Architecture Gaps

- WDK interface exists but implementation is missing.
- Supabase client exists but schema/types are missing.
- Feature slices are placeholders.
- Payment pipeline is not implemented.
- Confirm sheet displays a draft but cannot approve/sign.
- Auth/session routing is local-only and does not restore Supabase sessions.
- Database docs conflict and need consolidation.
