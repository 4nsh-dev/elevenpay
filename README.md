# ElevenPay

ElevenPay is an AI-native self-custodial wallet for football fans. It is built as an Expo React Native app with Supabase for coordination data and Tether Wallet Development Kit (WDK) as the custody layer.

Prime directive: **AI recommends, the user approves, WDK signs. Keys never leave the device.**

## Current Status

This project is in early scaffold stage. The app shell, routing, design tokens, UI primitives, local stores, Supabase client, WDK service interface, and copilot intent schema exist. Real authentication, WDK wallet operations, database migrations, payment flows, football features, and AI execution are not implemented yet.

## Stack

- Expo SDK 53, React Native, TypeScript
- Expo Router
- NativeWind 4
- Zustand
- TanStack Query
- Supabase
- Zod
- Tether WDK planned for custody
- Lucide icons

## Root Docs

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - project identity, current codebase state, engineering rules
- [PRD.md](./PRD.md) - product requirements and MVP scope
- [DATABASE.md](./DATABASE.md) - chosen database direction and schema plan
- [ARCHITECTURE.md](./ARCHITECTURE.md) - app, service, custody, payment, and AI architecture
- [TASKS.md](./TASKS.md) - development roadmap by status and build order

Detailed generated/spec docs also live in [docs/](./docs/).

## Setup

```bash
npm install
npx expo install --fix
cp .env.example .env
npm start
```

## Scripts

```bash
npm start
npm run lint
npm run typecheck
npm run format
```

## Architecture Rules

1. Routes in `app/` should stay thin and compose feature hooks/components.
2. Feature modules in `src/features/` should own domain workflows.
3. `src/services/wdk` is the only custody boundary.
4. Keys, mnemonics, and signatures must never enter Zustand, Supabase, logs, or AI context.
5. Every money movement must use the same pipeline: intent -> prepare -> approve -> sign -> record.
6. AI may prepare intents, but it must never execute payments.
7. Supabase records coordination state and ledger metadata; chain state remains the source of truth for funds.
