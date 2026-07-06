# ElevenPay — Production Database Design (Supabase / PostgreSQL)

No SQL here — this is the design contract the migrations will implement.

## Design rules (apply everywhere)

- Money columns are `numeric(20,6)`, never float. Timestamps are `timestamptz`, never naive.
- Status/type columns are `text` with `CHECK` constraints (easier to evolve than Postgres enums during a hackathon; same integrity).
- Every table: `id uuid` PK (`gen_random_uuid()`), `created_at` default `now()`; mutable tables also get `updated_at` maintained by trigger.
- The `transactions` table is an **append-only ledger**: no UPDATE except status transitions, no DELETE ever. History is truth.
- **Clients may claim intent; only the server may claim success.** Clients insert PENDING rows; only edge functions (service role) mark SUCCESS/FAILED after verifying on-chain. RLS enforces this.
- No private keys, no recovery phrases, no key-derived material — ever. The DB stores addresses and metadata only.
- Default-deny RLS on every table. The anon key is shippable *because* policies are the perimeter.

## Tables (10)

### 1. `users` — profile, 1:1 with `auth.users`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | **FK → auth.users(id) ON DELETE CASCADE** — same id everywhere |
| username | text UNIQUE | for friend search / @handles; citext behavior via lower-index |
| full_name | text NOT NULL | |
| email | text | mirrored from auth by trigger for query convenience |
| avatar_url | text | Supabase storage path |
| favorite_team | text | drives home-screen match priority |
| created_at / updated_at | timestamptz | |

Created automatically by a trigger on `auth.users` insert (never trust the client to create its own profile row).

### 2. `wallets` — address registry (display cache, not custody)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users **ON DELETE CASCADE** | |
| wallet_address | text **UNIQUE** NOT NULL | checksummed format validated app-side |
| blockchain | text NOT NULL | e.g. 'ethereum-sepolia'; CHECK against supported list |
| balance | numeric(20,6) NOT NULL DEFAULT 0 | **display cache only** — chain is truth |
| balance_updated_at | timestamptz | staleness stamp shown in UI ("as of 10:32") |
| created_at | timestamptz | |

Constraints: `UNIQUE (user_id, blockchain)` — one wallet per chain per user (MVP).

### 3. `transactions` — the ledger

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sender_wallet | uuid FK → wallets **ON DELETE RESTRICT**, NULL | NULL = external/faucet inbound |
| receiver_wallet | uuid FK → wallets **ON DELETE RESTRICT**, NULL | NULL = external outbound |
| amount | numeric(20,6) CHECK (amount > 0) | |
| fee | numeric(20,6) DEFAULT 0 | network fee, display |
| currency | text DEFAULT 'USDT' | |
| transaction_hash | text UNIQUE NULLS DISTINCT | NULL until broadcast; unique = idempotency guard |
| type | text CHECK | SEND · WATCH_PARTY · POOL_ENTRY · POOL_REWARD · SPLIT_BILL · TIP · FAUCET |
| status | text CHECK | PENDING → BROADCAST → SUCCESS \| FAILED |
| reference_id | uuid, NULL | polymorphic link: party id, pool id, or split id (interpreted by `type`) |
| idempotency_key | uuid UNIQUE, NULL | client-generated; double-tap protection |
| memo | text | CHECK char_length ≤ 280 |
| created_at / confirmed_at | timestamptz | |

Constraints: `CHECK (sender_wallet IS NOT NULL OR receiver_wallet IS NOT NULL)`; `CHECK (sender_wallet IS DISTINCT FROM receiver_wallet)` (no self-send).

### 4. `matches` — optional but recommended (powers Today's Match + pool seeding)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| team_a / team_b | text NOT NULL | |
| kickoff_at | timestamptz NOT NULL | |
| status | text CHECK | SCHEDULED · LIVE · FINISHED |
| winner_team | text, NULL | CHECK winner IN (team_a, team_b) when set |
| created_at | timestamptz | |

Demo-seeded; `resolve-pool` writes `winner_team` here first, pools follow.

### 5. `watch_parties`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organizer_id | uuid FK → users **ON DELETE RESTRICT** | a party must keep its organizer |
| match_id | uuid FK → matches **ON DELETE SET NULL**, NULL | |
| title / venue / city | text NOT NULL | |
| match_name | text | denormalized display fallback |
| entry_fee | numeric(20,6) CHECK (≥ 0) | 0 = free party |
| max_participants | integer CHECK (> 0) | |
| event_date | timestamptz NOT NULL | |
| image_url | text | storage path |
| status | text CHECK | OPEN · FULL · PAST · CANCELLED (FULL/PAST derivable; stored for cheap filtering) |
| created_at / updated_at | timestamptz | |

### 6. `watch_party_members` — membership + seat reservation

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| watch_party_id | uuid FK → watch_parties **ON DELETE CASCADE** | |
| user_id | uuid FK → users **ON DELETE CASCADE** | |
| payment_status | text CHECK | RESERVED → PAID \| EXPIRED (RESERVED implements the 3-min seat hold) |
| reserved_until | timestamptz, NULL | set on insert; expiry sweep via pg_cron or lazy check |
| transaction_id | uuid FK → transactions **ON DELETE SET NULL**, NULL | receipt link |
| joined_at | timestamptz | |

Constraints: `UNIQUE (watch_party_id, user_id)` — join once. Capacity enforced at insert time against count of RESERVED+PAID (in a serialized function, not client math).

### 7. `prediction_pools`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| match_id | uuid FK → matches **ON DELETE SET NULL**, NULL | |
| watch_party_id | uuid FK → watch_parties **ON DELETE SET NULL**, NULL | pools may attach to a party |
| match_name / team_a / team_b | text NOT NULL | |
| entry_fee | numeric(20,6) CHECK (> 0) | |
| prize_pool | numeric(20,6) NOT NULL DEFAULT 0 | maintained by trigger on prediction insert |
| status | text CHECK | OPEN → LIVE → FINISHED \| CANCELLED |
| winner_team | text, NULL | CHECK (winner_team IN (team_a, team_b)); NOT NULL required when status = FINISHED |
| closes_at | timestamptz NOT NULL | entries rejected after this (constraint trigger, not client clock) |
| resolved_at | timestamptz, NULL | |
| created_at / updated_at | timestamptz | |

### 8. `predictions`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| pool_id | uuid FK → prediction_pools **ON DELETE CASCADE** | |
| user_id | uuid FK → users **ON DELETE CASCADE** | |
| selected_team | text NOT NULL | CHECK: must equal pool's team_a or team_b (constraint trigger) |
| is_winner | boolean, NULL | NULL until resolved; set only by service role |
| transaction_id | uuid FK → transactions **ON DELETE SET NULL** | entry payment receipt |
| created_at | timestamptz | |

Constraints: `UNIQUE (pool_id, user_id)` — one pick, final (no UPDATE policy exists at all).

### 9. `splits` — a bill

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| creator_id | uuid FK → users **ON DELETE CASCADE** | |
| total_amount | numeric(20,6) CHECK (> 0) | |
| currency | text DEFAULT 'USDT' | |
| memo | text | "Dinner at Olive 🍽" |
| status | text CHECK | OPEN → SETTLED \| CANCELLED (SETTLED when all members PAID) |
| created_at / updated_at | timestamptz | |

### 10. `split_members` — each friend's leg

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| split_id | uuid FK → splits **ON DELETE CASCADE** | |
| user_id | uuid FK → users **ON DELETE CASCADE**, NULL | NULL = external friend paid via link |
| external_ref | text, NULL | share-link token for non-users; CHECK: user_id or external_ref present |
| share_amount | numeric(20,6) CHECK (> 0) | |
| status | text CHECK | REQUESTED → PAID \| CANCELLED |
| transaction_id | uuid FK → transactions **ON DELETE SET NULL**, NULL | |
| reminded_at | timestamptz, NULL | enforces the once-per-24h remind rule |
| paid_at | timestamptz, NULL | |

Constraints: `UNIQUE (split_id, user_id)` (nulls distinct); shares-sum-to-total enforced in the create-split RPC (single transaction), not per-row.

## Relationship map

```
auth.users 1─1 users ─┬─1:N─ wallets ─┬─1:N─ transactions (as sender)
                      │               └─1:N─ transactions (as receiver)
                      ├─1:N─ watch_parties (organizer)
                      ├─1:N─ watch_party_members ─N:1─ watch_parties ─N:1─ matches
                      ├─1:N─ predictions ─N:1─ prediction_pools ─N:1─ matches
                      │                            └─N:1(nullable)─ watch_parties
                      ├─1:N─ splits (creator) ─1:N─ split_members
                      └─1:N─ split_members (as payer)

transactions.reference_id ──(by type)──> watch_parties | prediction_pools | splits
watch_party_members.transaction_id / predictions.transaction_id /
split_members.transaction_id ──> transactions (receipt links)
```

FK deletion policy: CASCADE where the child is meaningless without the parent (members, predictions, split legs); RESTRICT where history must survive (wallets with transactions, party organizers); SET NULL for optional enrichments (match links, receipt links).

## Indexes

Beyond the automatic PK/UNIQUE indexes:

| Index | Why |
|---|---|
| `wallets (user_id)` | wallet lookup at session start |
| `transactions (sender_wallet, created_at DESC)` | outbound history, newest first |
| `transactions (receiver_wallet, created_at DESC)` | inbound history |
| `transactions (reference_id)` | "show payments for this pool/party/split" |
| `transactions (status) WHERE status IN ('PENDING','BROADCAST')` | **partial** — confirmation worker scans only open txs |
| `watch_parties (event_date) WHERE status = 'OPEN'` | partial — upcoming-parties list |
| `watch_parties (city)` | nearby filter |
| `watch_party_members (watch_party_id)` | attendee lists + seat counting |
| `watch_party_members (user_id)` | "my parties" |
| `watch_party_members (reserved_until) WHERE payment_status = 'RESERVED'` | partial — expiry sweep |
| `prediction_pools (status, closes_at)` | open-pools feed |
| `predictions (pool_id)` | pool entries + resolution scan |
| `predictions (user_id, created_at DESC)` | "my picks" |
| `splits (creator_id, created_at DESC)` | my splits |
| `split_members (split_id)` | legs per split |
| `split_members (user_id) WHERE status = 'REQUESTED'` | partial — "you owe" badge |
| `users (lower(username))` | case-insensitive friend search |

Composite before single, partial where the hot query has a fixed predicate. Nothing else until a real slow query appears.

## RLS Policies (default-deny; policies below are the only holes)

**Roles:** `authenticated` (app users), `service_role` (edge functions only — bypasses RLS). No policy grants anon anything.

### users
- SELECT: own row.
- Public discovery via **`public_profiles` view** (id, username, full_name, avatar_url, favorite_team only) — email is never exposed to other users.
- UPDATE: own row; trigger blocks changing `id`/`email`.
- INSERT/DELETE: none (auth trigger creates; account deletion cascades from auth).

### wallets
- SELECT: own rows. (Address lookup for sending is via an RPC that resolves username → address without exposing wallet rows.)
- INSERT: own row, at most one per (user, blockchain) — unique constraint backs the policy.
- UPDATE: own row, **only** `balance`/`balance_updated_at` (column-guard trigger); address and chain are immutable.
- DELETE: none.

### transactions
- SELECT: rows where the user owns `sender_wallet` OR `receiver_wallet`.
- INSERT: only with `status = 'PENDING'` and `sender_wallet` owned by the user (FAUCET/POOL_REWARD inserts come from service role).
- UPDATE: **none for authenticated.** Status transitions (BROADCAST/SUCCESS/FAILED, `transaction_hash`, `confirmed_at`) are service-role only, after on-chain verification. Clients cannot mint themselves a successful payment.
- DELETE: none. Ever.

### matches
- SELECT: all authenticated. INSERT/UPDATE/DELETE: service role only.

### watch_parties
- SELECT: all authenticated (public discovery — a product requirement).
- INSERT: organizer_id = self.
- UPDATE: organizer only, and not after status = PAST; capacity/status flips also via service role.
- DELETE: none (CANCELLED status instead — members need the record).

### watch_party_members
- SELECT: own memberships, OR any membership of a party the user organizes, OR aggregate counts via a `party_attendance` view (avatars + count without exposing other members' payment status).
- INSERT: self only, `payment_status = 'RESERVED'`, via the capacity-checking RPC.
- UPDATE: RESERVED→PAID via service role (tied to verified transaction); user may cancel own RESERVED row.
- DELETE: none (EXPIRED/CANCELLED by status).

### prediction_pools
- SELECT: all authenticated.
- INSERT/UPDATE: service role only (pools are seeded/resolved by the system; `prize_pool` moves by trigger).
- DELETE: none (CANCELLED status).

### predictions
- SELECT: own rows always; **other users' picks only when pool status ≠ OPEN** (no copying picks before close — enforced in policy, not UI).
- INSERT: self only, pool OPEN and `now() < closes_at` (constraint trigger), one per pool (unique).
- UPDATE: none for authenticated — picks are final; `is_winner` is service-role.
- DELETE: none.

### splits
- SELECT: creator or member.
- INSERT: creator = self (via create-split RPC that also writes legs atomically).
- UPDATE: creator may CANCEL while OPEN; SETTLED flips by trigger when last leg pays.
- DELETE: none.

### split_members
- SELECT: the member themself or the split's creator.
- INSERT: only via the create-split RPC.
- UPDATE: leg → PAID via service role (verified payment); creator may CANCEL a leg; `reminded_at` update allowed to creator with 24h-guard trigger.
- DELETE: none.

## Best Practices (the ones this design actually commits to)

1. **Ledger discipline** — transactions are append-only; every state is a status, never a delete. The audit trail is the product's trust story.
2. **Server-verified success** — RLS splits "I intend to pay" (client) from "payment happened" (service role after chain verification). This single rule prevents the entire class of faked-payment bugs.
3. **Constraints over conventions** — unique keys for idempotency (double-tap, one-pick-per-pool, join-once), CHECKs for money sanity, constraint triggers for cross-row rules (pick ∈ teams, entries before closes_at). The DB enforces what the UI promises.
4. **Atomic multi-row operations live in RPCs** — create-split (split + legs + sum check), join-party (capacity + reservation), resolve-pool (winner + flags + payouts) each run in one transaction server-side. Clients never orchestrate multi-step money state.
5. **Views for privacy shaping** — `public_profiles`, `party_attendance`: expose aggregates and safe columns instead of loosening table policies.
6. **Denormalize for the feed, derive for the truth** — `prize_pool` and party `status` are maintained by triggers for cheap reads, but resolution logic recomputes from `predictions` before paying out.
7. **Idempotency keys end-to-end** — client-generated `idempotency_key` on transactions; retries are safe by construction.
8. **Migrations are the only schema channel** — numbered Supabase migrations in git; `seed.sql` for demo data (matches, parties, pools); generated TypeScript types keep the app honest.
9. **Realtime scoped to what moves** — publications on prediction_pools (prize/status), watch_party_members (seats), transactions (incoming money), split_members (settlement) — not on users/wallets.
10. **Custody red line** — nothing key-shaped in any column, ever; `wallets.balance` is a labeled cache with a staleness timestamp the UI shows.
