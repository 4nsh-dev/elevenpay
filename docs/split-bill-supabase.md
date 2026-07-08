# Split bill on Supabase

How the Split Bill feature works after the live-data pass. The old
`src/features/split-bill/index.ts` stub is replaced by a full feature module.

## Data model

- `splits` — the bill header (`creator_id`, `total_amount`, `memo`, `status`
  `OPEN`/`SETTLED`/`CANCELLED`). RLS: visible to the creator and members.
- `split_members` — one leg per participant (`share_amount`, `status`
  `REQUESTED`/`PAID`/`CANCELLED`, `transaction_id`, `paid_at`). Legs belong to
  a registered user (`user_id`) or an external guest (`external_ref` share
  code). Guards: identity columns immutable, PAID only via server, 24h
  reminder rule; an after-update trigger auto-settles the split when the
  last leg pays.
- `transactions` — `SPLIT_BILL` ledger rows created by the standard payment
  pipeline when a member pays their share.

## Flows

### Create bill + add participants

The `/split` screen (linked from the home quick action) collects the total,
memo, and participants: yourself, friends found via `public_profiles`
username search, and guests without accounts. **`create_split` RPC** inserts
the header and all legs atomically, validating 1–20 members, positive
shares, and that shares sum exactly to the total. The creator's own leg is
settled instantly; guest legs get a generated `external_ref` share code.

### AI calculates shares

`aiCalculateShares()` is an on-device AI assistant that produces exact
6-decimal shares: it honors locked shares, distributes the remainder evenly
across unlocked participants in micro-USDT (bigint — no float drift), and
assigns rounding so shares always sum exactly to the total. It returns a
plain-language explanation that is shown in the UI. The contract
(`(total, participants) -> shares + explanation`) is deliberately small so a
hosted LLM suggester can replace the heuristic later without UI changes.

### Generate payment requests

Every non-creator leg is stored as a `REQUESTED` row — that row *is* the
payment request. Members see their open requests in the screen's Activity
tab (`listMyOwedLegs`), with the creator's name resolved via
`public_profiles`. Guests are tracked by share code (see hardening notes).

### Complete WDK payments

Paying a request runs the same pipeline as every other payment in the app:

1. **`pay_split_leg` RPC** validates ownership and status and returns the
   canonical payment template.
2. The client resolves the creator's payable address (`resolve_wallet`) and
   hands a `SPLIT_BILL` draft to the confirm sheet.
3. `recordAndBroadcast` writes the PENDING ledger row, WDK signs on-device,
   and the row flips to BROADCAST with the hash (idempotency-keyed, outbox
   retry).
4. **`confirm_split_payment` RPC** (migration `20260707001100`) verifies the
   broadcast ledger row server-side and flips the leg REQUESTED -> PAID with
   the receipt linked. Clients cannot flip PAID directly (trigger guard).
5. The settle trigger flips the split to SETTLED when the last leg pays.

### Save history

Everything is persistent in Supabase: bills in `splits`, per-person legs and
receipts in `split_members`, and the transfers themselves in `transactions`
(which also feed the existing wallet history screen). The Activity tab shows
both directions — requests you owe and splits you created/joined with
paid-leg progress — straight from these tables.

## Error handling

RPC errors use stable prefixes (`VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`,
`CONFLICT`, `UNAUTHENTICATED`) mapped to friendly copy by
`friendlySplitError()`. The screen has loading, error + retry, and empty
states, and the share form mirrors server validation before submitting.

## Hardening notes (production)

- Guest share codes are stored but there is no public claim flow yet; a
  share-link screen (deep link + `external_ref` lookup) can be added without
  schema changes.
- Tighten `confirm_split_payment`'s status filter to `'SUCCESS'` once the
  submit-tx edge function confirms transactions on-chain.
- Reminders currently update `reminded_at` (24h server rule); wiring push
  notifications is a follow-up.
