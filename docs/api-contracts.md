# ElevenPay — REST API Contracts

No implementation — this is the contract. Each endpoint is tagged with its realization:
**[PostgREST]** table/view CRUD under RLS · **[RPC]** Postgres function (atomic, serialized) · **[Edge]** Supabase Edge Function (service role, privileged) · **[Auth]** Supabase Auth built-in.

## Global conventions

- **Base:** `https://<project>.supabase.co` (`/auth/v1`, `/rest/v1`, `/functions/v1`). Contract paths below are logical; the realization tag defines the physical route.
- **Content type:** JSON everywhere. Amounts are **strings** ("5.000000") to avoid float drift; currency `USDT` implied unless stated.
- **Auth:** `Authorization: Bearer <supabase_jwt>` on everything except the auth endpoints. There is no API-key path for clients; the JWT + RLS is the perimeter.
- **Idempotency:** every money-creating POST requires `Idempotency-Key: <uuid>` header (persisted on the transaction row; replays return the original result with `200` instead of creating twice).
- **Pagination:** cursor-based — `?cursor=<opaque>&limit=<1..50, default 20>`; responses carry `next_cursor: string|null`.
- **Error envelope (all non-2xx):**

```json
{ "error": { "code": "INSUFFICIENT_FUNDS", "message": "Not enough USDT. You have 4.20.", "details": { "field": "amount" } } }
```

- **Common status codes:** `400` malformed/validation · `401` missing/expired JWT · `403` RLS/ownership denial · `404` not found (or hidden by RLS — indistinguishable, by design) · `409` state conflict (already joined, pool closed, sold out) · `422` semantically invalid (bad address checksum) · `429` rate limit (`Retry-After` header) · `500` never leaks internals.
- **Common error codes:** `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INSUFFICIENT_FUNDS`, `POOL_CLOSED`, `PARTY_FULL`, `RESERVATION_EXPIRED`, `ALREADY_EXISTS`, `RATE_LIMITED`.
- **Rate limits:** auth 5/min/IP · money POSTs 10/min/user · AI 20/min/user · reads 120/min/user.

---

## 1. Authentication [Auth]

### POST /auth/otp — request sign-in code
- **Req:** `{ "email": "ansh@example.com" }`
- **Res 200:** `{ "sent": true }` (same response whether or not the email exists — no account enumeration)
- **Auth:** none (anon key). **Validation:** RFC-5322 email, ≤ 254 chars. **Errors:** 400 `VALIDATION_ERROR`, 429 `RATE_LIMITED` (5/min/IP, 3/min/email).

### POST /auth/verify — exchange OTP for session
- **Req:** `{ "email": "...", "token": "482913" }`
- **Res 200:** `{ "access_token": "...", "refresh_token": "...", "expires_in": 3600, "user": { "id": "uuid", "is_new": true } }`
- **Auth:** none. **Validation:** token = 6 digits. **Errors:** 400 `VALIDATION_ERROR`, 401 `OTP_INVALID` / `OTP_EXPIRED`, 429 after 5 failed attempts (60s cooldown).

### POST /auth/refresh
- **Req:** `{ "refresh_token": "..." }` → **Res 200:** new token pair. **Errors:** 401 `REFRESH_INVALID` (client returns to Sign In).

### POST /auth/logout
- **Req:** empty. **Res 204.** **Auth:** Bearer. Revokes server session; client clears local state (keys stay in SecureStore).

---

## 2. Profile

### GET /me [PostgREST: users]
- **Res 200:** `{ "id", "username", "full_name", "email", "avatar_url", "favorite_team", "created_at" }`
- **Auth:** Bearer (RLS: own row). **Errors:** 401.

### PATCH /me [PostgREST: users]
- **Req (any subset):** `{ "username": "ansh", "full_name": "Ansh", "avatar_url": "avatars/…", "favorite_team": "Argentina" }`
- **Res 200:** updated profile.
- **Validation:** username `^[a-z0-9_]{3,20}$`, unique (409 `ALREADY_EXISTS`); full_name 1–80 chars; favorite_team from known list or free text ≤ 40; `id`/`email` immutable (400).
- **Errors:** 400, 401, 409.

### GET /profiles?username=alex [PostgREST: public_profiles view]
- **Res 200:** `[{ "id", "username", "full_name", "avatar_url", "favorite_team" }]` — prefix search, ≤ 10 rows, never email.
- **Auth:** Bearer. **Validation:** query ≥ 2 chars (400).

### POST /me/avatar [Edge]
- **Req:** multipart image ≤ 2 MB (jpeg/png/webp) → **Res 201:** `{ "avatar_url" }`. **Errors:** 400 `VALIDATION_ERROR` (type/size), 401.

---

## 3. Wallet

### POST /wallets [PostgREST: wallets]
Register the device-created wallet (called once after WDK keygen).
- **Req:** `{ "wallet_address": "0x…", "blockchain": "ethereum-sepolia" }`
- **Res 201:** wallet row. **Auth:** Bearer (RLS: user_id = self).
- **Validation:** address checksum valid for chain (422 `VALIDATION_ERROR`); blockchain in supported list; one wallet per (user, chain) → 409 `ALREADY_EXISTS`.

### GET /wallets/me [PostgREST]
- **Res 200:** `{ "id", "wallet_address", "blockchain", "balance": "58.420000", "balance_updated_at" }`
- **Errors:** 401; 404 if wallet not yet registered (client routes to creation).

### POST /wallets/me/balance-sync [PostgREST PATCH under column-guard]
Client reports the fresh chain balance it just read via WDK (display cache only).
- **Req:** `{ "balance": "58.420000" }` → **Res 200:** updated row with `balance_updated_at = now()`.
- **Validation:** decimal string, ≥ 0, ≤ 10^12 (400). Only balance columns updatable — anything else 403.

### GET /wallets/resolve?username=alex [RPC]
Resolve a recipient to an address without exposing wallet rows.
- **Res 200:** `{ "user_id", "username", "wallet_address", "blockchain" }`
- **Errors:** 404 `NOT_FOUND` (no such user or no wallet — same response), 401. **Validation:** username pattern as above.

### POST /faucet [Edge]
Demo USDT for new wallets.
- **Req:** empty (wallet inferred). **Res 202:** `{ "transaction_id", "amount": "50.000000", "status": "PENDING" }` — faucet tx lands via realtime when confirmed.
- **Errors:** 409 `CONFLICT` (already funded), 429 (1/day/user), 401. **Headers:** Idempotency-Key required.

---

## 4. Transactions

### POST /transactions [PostgREST]
Declare intent — creates the PENDING ledger row *before* signing.
- **Req:**
```json
{ "sender_wallet": "uuid", "receiver_wallet": "uuid", "amount": "5.000000",
  "type": "SEND", "reference_id": null, "memo": "For the kebabs 🌯" }
```
- **Res 201:** transaction row, `status: "PENDING"`.
- **Auth:** Bearer (RLS: sender owned by caller; status forced PENDING).
- **Validation:** amount > 0 (400); sender ≠ receiver (400 `VALIDATION_ERROR`, "That's you 👋" client-side); type in enum minus FAUCET/POOL_REWARD (403 — those are server-minted); memo ≤ 280; `reference_id` required when type ∈ {WATCH_PARTY, POOL_ENTRY, SPLIT_BILL, TIP} and must exist (422); amount ≤ cached balance is *client* UX — the chain is the real check.
- **Headers:** Idempotency-Key required (replay → 200 with original row).
- **Errors:** 400, 401, 403, 422.

### POST /transactions/{id}/submit [Edge]
Client submits the broadcast hash; server takes over verification.
- **Req:** `{ "transaction_hash": "0x…" }` → **Res 202:** `{ "status": "BROADCAST" }`. Server verifies on-chain and flips to SUCCESS/FAILED (realtime pushes the change; domain rows — membership PAID, split leg PAID — flip in the same server step).
- **Errors:** 404 (not caller's tx), 409 `CONFLICT` (already submitted / not PENDING), 422 (hash format / hash already claimed by another tx).
- **Validation:** hash matches chain format; tx row belongs to caller's wallet.

### GET /transactions [PostgREST]
- **Query:** `?type=SEND|…&status=…&direction=in|out&cursor&limit`
- **Res 200:** `{ "items": [ { "id", "direction", "counterparty": { "username", "full_name", "avatar_url" } | { "address": "0x…" }, "amount", "fee", "type", "status", "memo", "transaction_hash", "created_at", "confirmed_at" } ], "next_cursor" }`
- **Auth:** Bearer (RLS: endpoint ownership). **Errors:** 400 bad cursor/filter, 401.

### GET /transactions/{id} [PostgREST]
- **Res 200:** full row + status timeline (`created_at`, `broadcast_at`, `confirmed_at`) + explorer URL. **Errors:** 401, 404.

---

## 5. Watch Parties

### GET /watch-parties [PostgREST]
- **Query:** `?city=Delhi&status=OPEN&from=<iso>&cursor&limit`
- **Res 200:** `{ "items": [ { "id", "title", "venue", "city", "match_name", "entry_fee", "max_participants", "seats_taken", "event_date", "image_url", "status", "organizer": { public profile } } ], "next_cursor" }` (`seats_taken` from `party_attendance` view)
- **Auth:** Bearer. **Errors:** 400, 401.

### GET /watch-parties/{id} [PostgREST + view]
- **Res 200:** party + `seats_taken` + `attendee_preview` (≤ 8 public profiles) + `my_membership: { "payment_status", "reserved_until", "transaction_id" } | null`
- **Errors:** 401, 404.

### POST /watch-parties [PostgREST] *(post-MVP; contract reserved)*
- **Req:** `{ "title", "venue", "city", "match_id", "entry_fee", "max_participants", "event_date" }` → **Res 201.**
- **Validation:** event_date future (422); entry_fee ≥ 0; max_participants 1–500; title 3–80.

### POST /watch-parties/{id}/join [RPC: join_party]
Atomic capacity check + seat reservation.
- **Req:** empty → **Res 201:**
```json
{ "membership_id": "uuid", "payment_status": "RESERVED", "reserved_until": "…+3m",
  "payment": { "amount": "5.000000", "receiver_wallet": "uuid", "type": "WATCH_PARTY", "reference_id": "<party_id>" } }
```
(client then runs the standard transaction pipeline with the returned payment template)
- **Errors:** 409 `PARTY_FULL` · 409 `ALREADY_EXISTS` (member) · 409 `CONFLICT` (party not OPEN) · 401, 404.
- **Validation:** RPC serializes seat counting; free party (fee 0) returns `payment: null` and PAID immediately.

### DELETE /watch-parties/{id}/membership [PostgREST]
Cancel own RESERVED (unpaid) seat. **Res 204.** **Errors:** 409 `CONFLICT` if PAID (paid seats are cancelled via party cancellation only), 404.

### GET /watch-parties/{id}/members [PostgREST: party_attendance view]
- **Res 200:** `{ "count", "items": [public profiles] }` — payment statuses visible only to the organizer.

---

## 6. Prediction Pools

### GET /pools [PostgREST]
- **Query:** `?status=OPEN&match_id&cursor` → **Res 200:** `{ "items": [ { "id", "match_name", "team_a", "team_b", "entry_fee", "prize_pool", "status", "closes_at", "participants_count", "my_prediction": { "selected_team", "created_at" } | null } ], "next_cursor" }`

### GET /pools/{id} [PostgREST]
- **Res 200:** pool + `participants_count` + `my_prediction` + (when status ≠ OPEN) `predictions_breakdown: { "team_a": 12, "team_b": 8 }`. Breakdown before close: 403 by RLS — omitted from payload.

### POST /pools/{id}/predictions [RPC: enter_pool]
- **Req:** `{ "selected_team": "England" }`
- **Res 201:** `{ "prediction_id", "payment": { "amount", "receiver_wallet", "type": "POOL_ENTRY", "reference_id": "<pool_id>" } }`
- **Errors:** 409 `POOL_CLOSED` (status ≠ OPEN or now ≥ closes_at) · 409 `ALREADY_EXISTS` (one pick, final) · 422 `VALIDATION_ERROR` (team not in {team_a, team_b}) · 401, 404.
- **Headers:** Idempotency-Key required.

### GET /pools/{id}/predictions [PostgREST]
- **Res 200:** `{ "items": [ { "user": public profile, "selected_team", "is_winner" } ] }` — **RLS: rows visible only when pool status ≠ OPEN** (else own row only). No pick-copying.

### POST /pools/{id}/resolve [Edge — demo/organizer only]
- **Req:** `{ "winner_team": "Brazil" }` or `{ "simulate": true }`
- **Res 200:** `{ "status": "FINISHED", "winner_team", "winners": [user_ids], "payout_per_winner": "12.500000", "payout_transaction_ids": [...] }`
- **Auth:** Bearer + role check (demo admin / pool creator claim). **Errors:** 403, 409 `CONFLICT` (already FINISHED), 422 (winner not a pool team).
- Server: sets match/pool winner → flags `is_winner` → recounts entries → mints POOL_REWARD transactions from treasury → realtime pushes Result screens.

---

## 7. Bill Split

### POST /splits [RPC: create_split — atomic: split + legs]
- **Req:**
```json
{ "total_amount": "100.000000", "memo": "Dinner at Olive 🍽",
  "members": [ { "user_id": "uuid-alex", "share_amount": "25.000000" },
               { "user_id": "uuid-john", "share_amount": "25.000000" },
               { "user_id": "uuid-emma", "share_amount": "25.000000" },
               { "self": true, "share_amount": "25.000000" } ] }
```
- **Res 201:** split + legs (self-leg already PAID) + `share_links` for any external members.
- **Validation:** Σ shares = total (400 `VALIDATION_ERROR`, details carry the delta "2.000000 unassigned"); 1–20 members; each share > 0; duplicate members 400; memo ≤ 140.
- **Errors:** 400, 401, 404 (unknown member user_id).

### GET /splits [PostgREST]
- **Query:** `?role=creator|member&status=OPEN&cursor` → **Res 200:** items with `progress: { "paid": 1, "total": 3 }`.

### GET /splits/{id} [PostgREST]
- **Res 200:** split + legs `[ { "leg_id", "user": public profile | { "external_ref" }, "share_amount", "status", "paid_at" } ]`. **Auth:** creator or member (else 404).

### POST /splits/{id}/legs/{leg_id}/pay [RPC]
Member accepts their leg → returns the standard payment template.
- **Res 200:** `{ "payment": { "amount", "receiver_wallet": "<creator's>", "type": "SPLIT_BILL", "reference_id": "<split_id>" } }`
- **Errors:** 403 (not your leg), 409 `CONFLICT` (already PAID / split CANCELLED).

### POST /splits/{id}/legs/{leg_id}/remind [Edge]
- **Res 202:** `{ "reminded": true }`. **Errors:** 403 (creator only), 429 `RATE_LIMITED` (once per 24h per leg — `reminded_at` guard), 409 (leg not REQUESTED).

### POST /splits/{id}/cancel [PostgREST]
- **Res 200:** split CANCELLED, open legs CANCELLED (paid legs stay in ledger). **Errors:** 403 (creator only), 409 (already SETTLED).

---

## 8. AI Copilot [Edge] *(bonus — consumed by the AI tab and floating button)*

### POST /ai/copilot
- **Req:** `{ "message": "split 100 between alex, john and emma", "context": { "screen": "home" } }`
- **Res 200:** `{ "reply": "Everyone pays 25 USDT — ready to send requests?", "intent": { "type": "SPLIT_BILL", "total_amount": "100.000000", "members": [...] } | null }`
- **Contract law:** `intent` is Zod-validated server-side against the same schemas as the endpoints above; the client renders it into the matching flow's Review step. The copilot **never** executes — it fills forms.
- **Errors:** 400 (message empty / > 1000 chars), 429 (20/min), 502 `UPSTREAM_ERROR` (OpenAI down → client says "I'm having trouble thinking right now").

---

## Cross-cutting summary

| Concern | Rule |
|---|---|
| Who can mark money moved | Only `/transactions/{id}/submit` verification path (service role). No client writes SUCCESS. |
| Idempotency | Header-required on faucet, transactions, pool entry; DB-unique backed. |
| Money flows | Every join/entry/leg-pay returns a **payment template**; the client always runs the same pipeline: create PENDING tx → confirm sheet → WDK sign → submit hash. |
| Enumeration safety | OTP responses uniform; RLS-hidden rows 404, not 403; username resolve 404s identically for "no user" and "no wallet". |
| Versioning | Contract-first; breaking changes = new RPC name / function version, not mutated payloads. |
