# ElevenPay — Product Requirements Document

**Product Name:** ElevenPay
**Tagline:** The AI-powered self-custodial wallet for football fans.

## Vision

ElevenPay is an AI-native self-custodial wallet that enables football fans to seamlessly manage every tournament payment while retaining complete ownership of their assets through Tether's Wallet Development Kit (WDK).

Instead of switching between banking apps, messaging apps, ticketing platforms, and expense-sharing apps, football fans use a single intelligent wallet that understands football-related financial activities.

## Problem Statement

Football tournaments create thousands of financial interactions:

- Paying watch-party entry fees
- Splitting restaurant bills
- Sending money to friends
- Joining prediction pools
- Tipping creators
- Buying merchandise
- Purchasing tickets

Today's payment experience is fragmented across multiple platforms and traditional payment providers. These platforms are:

- Not self-custodial
- Not AI-assisted
- Not designed for football communities
- Unable to automate football-specific payment workflows

## Solution

ElevenPay combines:

- ✅ Self-custodial wallet
- ✅ AI-powered financial assistant
- ✅ Football payment workflows

into one mobile application powered by Tether WDK.

## Product Principles

1. **Users always own their money.** WDK manages wallets. No custodial accounts.
2. **Payments should require as few taps as possible.** AI reduces friction.
3. **Football experiences trigger wallet actions.** The wallet adapts to the event.
4. **Every payment is transparent.** Users can always review transactions.
5. **AI never owns user funds.** AI recommends actions. Users approve. WDK signs. This is extremely important because it demonstrates good security thinking.

## Home Screen — AI Wallet Dashboard

The dashboard proactively surfaces useful actions.

Example:

- Wallet: 58 USDT
- Upcoming Match: England vs Brazil
- Suggested Actions: Join Prediction Pool, Split Last Dinner, Pay Watch Party Fee

There is no dedicated AI chat screen — the AI lives inside the dashboard.

## AI Copilot

The AI appears throughout the application (not a separate AI Chat screen):

- Wallet: "You received 20 USDT yesterday."
- Prediction Pool: "The pool closes in 15 minutes."
- Split Bill: "Each friend owes 8 USDT."
- Watch Party: "This event still has 12 seats."

The floating AI button opens conversational mode only when needed.

### Natural language wallet operations

- "Send 5 USDT to Alex."
- "Split this bill."
- "Summarize today's spending."
- "Join the Argentina watch party."

AI prepares the transaction. User approves. WDK signs.

## Core Feature — Smart Payments

A hero feature. Everything is a payment workflow:

- Watch Party Payment
- Prediction Pool Entry
- Bill Split
- Friend Transfer
- Creator Tip
- Tournament Budget

## Out of Scope

Removed to keep the scope laser-focused on wallet and payments:

- Football News
- Match Commentary
- Player Statistics

Those belong in another product.

## Success Metrics

Users can complete the following journey without leaving ElevenPay:

1. Create wallet
2. Receive funds
3. Join watch party
4. Pay entry fee
5. Join prediction pool
6. Receive winnings
7. Split dinner
8. Review transaction history

This is the MVP success definition.

## MVP — Must Have

- Authentication
- WDK Wallet Creation
- Receive Funds
- Send Funds
- Transaction History
- Watch Party Payment
- Prediction Pool
- Bill Splitting
- AI Copilot
- QR Receive
- Wallet Security (explicitly listed — important in a self-custodial wallet project)

## Demo Flow — One Coherent Matchday Journey

1. User signs up.
2. ElevenPay creates a self-custodial wallet.
3. User receives demo USDT.
4. User joins a watch party.
5. AI prepares the payment.
6. User confirms.
7. WDK signs the transaction.
8. User joins a prediction pool.
9. Match result is simulated.
10. Winner receives the payout.
11. Friends split dinner using AI.
12. Transaction history shows every action.

This isn't twelve disconnected features. It's one coherent football matchday journey.
