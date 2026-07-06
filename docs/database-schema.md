# ElevenPay — Database Schema (MVP)

Backend: Supabase (Auth, Postgres, Storage, Row Level Security). Only 7 tables.

## 1. users

Stores profile information.

| Column | Type |
|---|---|
| id | UUID (Supabase Auth) |
| full_name | text |
| email | text |
| avatar_url | text |
| favorite_team | text |
| created_at | timestamp |

## 2. wallets ⭐ (most important table)

| Column | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| wallet_address | text |
| blockchain | text |
| balance | decimal |
| created_at | timestamp |

⚠️ Do not store private keys or recovery phrases in the database. WDK manages keys securely on the client/device or secure storage.

## 3. transactions

Every payment.

| Column | Type |
|---|---|
| id | UUID |
| sender_wallet | UUID |
| receiver_wallet | UUID |
| amount | decimal |
| currency | text |
| transaction_hash | text |
| type | text |
| status | text |
| created_at | timestamp |

Example `type` values: SEND, WATCH_PARTY, POOL_ENTRY, POOL_REWARD, SPLIT_BILL, TIP.

## 4. watch_parties

| Column | Type |
|---|---|
| id | UUID |
| title | text |
| venue | text |
| city | text |
| match_name | text |
| entry_fee | decimal |
| organizer_id | UUID |
| max_participants | integer |
| event_date | timestamp |
| created_at | timestamp |

Example: Argentina vs Brazil — Delhi Sports Cafe — 5 USDT.

## 5. watch_party_members

Many-to-many relationship between users and watch parties.

| Column | Type |
|---|---|
| id | UUID |
| watch_party_id | UUID |
| user_id | UUID |
| payment_status | text (PAID / PENDING) |
| joined_at | timestamp |

## 6. prediction_pools

| Column | Type |
|---|---|
| id | UUID |
| watch_party_id | UUID (nullable) |
| match_name | text |
| team_a | text |
| team_b | text |
| entry_fee | decimal |
| prize_pool | decimal |
| status | text (OPEN / LIVE / FINISHED) |
| winner_team | text |
| created_at | timestamp |

## 7. predictions

Every user's prediction.

| Column | Type |
|---|---|
| id | UUID |
| pool_id | UUID |
| user_id | UUID |
| selected_team | text |
| is_winner | boolean |
| created_at | timestamp |

## Relationships

- users → wallets → transactions
- users → watch_party_members → watch_parties
- prediction_pools → predictions → users

## Transaction Flow (watch party)

User joins watch party → insert watch_party_members → create transaction → WDK executes payment → update status = SUCCESS.

## Pool Flow

Pool → many users → predictions → winner → create payout transaction.

## Wallet Flow

Signup → WDK creates wallet → insert wallets → home screen.

## Indexes

Create indexes on: user_id, wallet_address, pool_id, watch_party_id, created_at. These are enough.

## Supabase Storage

One bucket: `avatars/`. Optional: `watch-party-images/`.

## Environment Variables

- SUPABASE_URL
- SUPABASE_KEY
- OPENAI_KEY
- WDK_API_KEY

## Row Level Security (RLS)

Enable RLS on every table. Users should only read and update: their wallet, their transactions, their predictions, their memberships. Everyone can read public watch parties and prediction pools.
