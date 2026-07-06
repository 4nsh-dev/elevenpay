# ElevenPay PRD

## Vision

ElevenPay is a self-custodial AI wallet for football fans. It lets users manage football-related payments while keeping full control of their assets through Tether WDK.

## Problem

Football matchdays create many small financial interactions:

- Paying watch party entry fees
- Splitting food and drinks
- Sending money to friends
- Joining prediction pools
- Receiving pool winnings
- Tipping creators or organizers

Today these actions are fragmented across payment apps, chats, spreadsheets, and event platforms.

## Solution

ElevenPay combines:

- A self-custodial USDT wallet
- Football-specific payment workflows
- An AI assistant that prepares actions
- A universal approval and signing flow

The user experience should feel like a premium fintech wallet, not a sports news app.

## Prime Directive

AI recommends -> user approves -> WDK signs -> Supabase records.

AI never signs, broadcasts, or controls funds.

## MVP Must Have

- Authentication
- Wallet creation and restore
- Secure local custody via WDK
- Receive funds
- Send funds
- Transaction history
- Watch party payment
- Prediction pool entry
- Prediction pool payout demo flow
- Bill splitting
- AI copilot intent preparation
- Universal confirm sheet
- Recovery phrase backup flow

## MVP Demo Journey

1. User signs in.
2. User creates or restores a wallet.
3. User receives demo USDT.
4. User joins a watch party.
5. User confirms the watch party payment.
6. WDK signs and broadcasts.
7. User joins a prediction pool.
8. Match result is simulated.
9. Winner receives payout.
10. User splits dinner with friends.
11. AI prepares one of the actions.
12. Transaction history shows the full story.

## Out of Scope For MVP

- Football news
- Match commentary
- Player statistics
- Real sports data oracle
- Production escrow contract
- Marketplace/merch/ticketing
- Multi-chain support beyond schema readiness

## Success Criteria

- A user can complete the full demo journey without leaving ElevenPay.
- No screen requires private-key knowledge.
- The confirm sheet clearly shows what will be signed.
- Every payment leaves an auditable transaction record.
- Failed or pending transactions do not imply funds moved.
- AI-generated actions always land in a review/confirm step.
