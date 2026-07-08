# AI Copilot — on-device, structured, key-free

The AI tab is now a working copilot. It is **not a general chatbot**: it plans
structured function calls against a fixed tool registry, executes them against
Supabase + the existing feature services, and renders typed result cards.
Anything outside its six capabilities is refused with a scope message.

## Never controls private keys

- Custody stays in `src/services/wdk`. The copilot never imports the service —
  the only WDK artifact it touches is the *type* `PaymentDraft`.
- `prepare_transfer` and `prepare_split_bill` produce **unsigned drafts**. A
  transfer draft is handed to the existing confirm sheet (`/confirm`) where the
  user reviews, approves, and signs; a split draft prefills the Split screen.
- Every read goes through RLS-scoped repositories (ledger, wallets, parties,
  pools). The context snapshot contains the cached balance and public rows —
  never mnemonics, keys, or signatures.

## Architecture — structured function calling

```
utterance -> planner (planToolCalls) -> ToolCall[] -> runToolCall -> ToolResult -> typed cards
                  ^                                        |
          CopilotContext (balance, ledger, parties, pools) +-- validateToolCall (JSON-schema args)
```

- `src/features/copilot/tools.ts` — `COPILOT_TOOLS`: six tool definitions with
  JSON-schema parameters (the exact `tools` payload a hosted LLM would
  receive), argument validation, and executors.
- `src/features/copilot/planner.ts` — deterministic on-device planner that
  emits `ToolCall` objects (intent + slot extraction: amounts, @usernames,
  periods, memos). Swappable: a hosted LLM planner can replace `planToolCalls`
  without touching the executor or the UI.
- `src/features/copilot/context.ts` — the read-only snapshot that grounds
  replies.
- `src/features/copilot/use-copilot.ts` — conversation state machine.
- `app/(tabs)/ai.tsx` — chat UI. Tool calls render as visible
  `name(<json args>)` chips; results render as typed cards with actions.

## Capabilities

| Tool | What it does | Writes? |
| --- | --- | --- |
| `explain_spending` | Outgoing USDT by category (today / week / month), exact micro-USDT math | No |
| `summarize_transactions` | Recent ledger lines + in/out totals, direction filter | No |
| `prepare_transfer` | Resolves @username via `resolve_wallet`, builds an unsigned `PaymentDraft` | Draft only |
| `prepare_split_bill` | Resolves friends, runs the share assistant, prefills the Split screen | Draft only |
| `recommend_watch_parties` | Joinable parties ranked by kickoff, seats, and your balance | No |
| `recommend_prediction_pools` | Open pools ranked by closing time and pot | No |

## Contextual, not generic

- The greeting, insight line, and suggestion chips come from the live context
  (cached balance, open parties/pools counts).
- Recommendations carry reasons grounded in your data ("fits your balance",
  "only 2 seats left", "closes in 45m").
- Transfer drafts warn when the amount exceeds your cached balance.
- Off-domain prompts get a refusal that lists what the copilot *can* do — no
  small talk, no invented answers.

## Handoffs

- Transfers: result card -> `useUiStore.setPendingDraft(draft)` -> `/confirm`
  (the same WDK signing path every feature uses).
- Splits: result card -> `useCopilotStore.setSplitPrefill(...)` -> `/split`
  (the screen consumes the prefill once on focus, then clears it).

## Hardening notes

- The planner is deliberately conservative: missing slots produce a prompt for
  a complete sentence ("Send 5 USDT to @sam for chai") instead of a guess.
- Failed ledger rows are excluded from totals; every tool degrades gracefully
  when offline (context sources fall back to empty instead of throwing).
- To move planning to a hosted LLM later: send `COPILOT_TOOLS` plus a context
  summary as the tools/system payload, parse the returned calls, and keep
  `validateToolCall` + `runToolCall` exactly as-is — the executor is already
  defensive.
