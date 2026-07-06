# ElevenPay — Development Workflow 🏆

The build order for ElevenPay, from specification to demo. Each phase feeds the next.

1. **PRD** — product requirements: vision, principles, MVP scope, success metrics, demo flow.
2. **UX Flow** — screen flows and user journeys derived from the PRD and design system.
3. **Database** — Supabase schema (7 tables: users, wallets, transactions, watch_parties, watch_party_members, prediction_pools, predictions) with RLS.
4. **System Architecture** — how the mobile app, Supabase coordination layer, Tether WDK custody layer, and OpenAI copilot layer fit together.
5. **API Contracts** — endpoints and payloads between the app and the backend for watch parties, pools, splits, and transactions.
6. **UI Components** — the reusable component library (GlassCard, WalletCard, MatchCard, PoolCard, TransactionCard, ActionButton, PrimaryButton, SecondaryButton, AIMessage, UserMessage, Avatar, BottomSheet).
7. **Authentication** — Supabase Auth signup/login, which triggers wallet creation.
8. **WDK Integration** — Tether Wallet Development Kit setup: on-device key management, wallet creation, signing.
9. **Wallet** — wallet screens: balance, receive (QR), send (review → confirm), transaction history.
10. **Payments** — Smart Payments workflows: watch party payment, prediction pool entry and payout, bill splitting, friend transfer, tips.
11. **AI** — AI Copilot: dashboard insights, contextual nudges, natural-language operations, conversational mode. AI prepares, user approves, WDK signs.
12. **Testing** — verify the full matchday journey end to end.
13. **Demo Polish** — micro-animations, splash screen, confetti on wins, the one coherent matchday story.
