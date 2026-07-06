# ElevenPay Database Plan

## Recommendation

Use the production-oriented 10-table schema from `docs/database-design.md` as the source of truth, then implement it in Supabase migrations.

The older `docs/database-schema.md` describes a smaller 7-table MVP, but it conflicts with the product scope because bill splitting is MVP and needs `splits` plus `split_members`. The project should consolidate around one schema before backend work continues.

## Core Rules

- Money columns use `numeric(20,6)`.
- Amounts in API/client code travel as decimal strings.
- Timestamps use `timestamptz`.
- RLS is enabled everywhere.
- Transactions are append-only.
- Clients may create payment intent rows, but only privileged backend verification may mark success/failure.
- No private keys, mnemonics, recovery phrases, or key-derived data are stored in Supabase.

## Tables

### `users`

Profile row linked 1:1 with `auth.users`.

Key fields: `id`, `username`, `full_name`, `email`, `avatar_url`, `favorite_team`, timestamps.

### `wallets`

Public wallet registry and display balance cache.

Key fields: `user_id`, `wallet_address`, `blockchain`, `balance`, `balance_updated_at`.

Important: balance is cache only. Chain is truth.

### `transactions`

Append-only payment ledger.

Key fields: `sender_wallet`, `receiver_wallet`, `amount`, `fee`, `currency`, `transaction_hash`, `type`, `status`, `reference_id`, `idempotency_key`, `memo`, timestamps.

Statuses: `PENDING`, `BROADCAST`, `SUCCESS`, `FAILED`.

Types: `SEND`, `WATCH_PARTY`, `POOL_ENTRY`, `POOL_REWARD`, `SPLIT_BILL`, `TIP`, `FAUCET`.

### `matches`

Seeded/demo football match data used by home, pools, and party context.

### `watch_parties`

Public watch party discovery and event metadata.

### `watch_party_members`

Membership and seat reservation state.

Statuses should support reservation lifecycle: `RESERVED`, `PAID`, `EXPIRED`.

### `prediction_pools`

Pool metadata, entry fee, prize pool, match teams, status, and winner.

### `predictions`

One final pick per user per pool.

### `splits`

Bill split header row.

### `split_members`

Each participant's requested share and settlement status.

## Required Backend Functions/RPCs

- `join_party` - capacity check plus reservation
- `enter_pool` - one-pick check plus payment template
- `create_split` - create split and legs atomically
- `pay_split_leg` - return payment template for a split leg
- `resolve_pool` - demo resolution and payout creation
- transaction submit/verify function - accepts broadcast hash, verifies chain, updates ledger/domain rows
- `demo_faucet` - demo funding path

## Generated Types

After migrations exist, replace `src/types/database.ts` with generated Supabase types:

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

Until this happens, Supabase calls will not have meaningful type coverage.
