/**
 * Demo mode fixtures — a deterministic sandbox snapshot of ElevenPay.
 *
 * Everything is plain data: no Supabase rows are read or written, no WDK keys
 * exist, and every id is prefixed with "demo-" so nothing can collide with
 * production entities. Timestamps are generated relative to now so the demo
 * always looks fresh.
 */

import type { PredictionPoolView } from '@/features/prediction-pool';
import type { WatchPartyView } from '@/features/watch-party';
import type { Transaction } from '@/services/supabase/repositories/transactions';
import type { DemoSnapshot } from '@/stores/demo';

export const DEMO_WALLET_ID = 'demo-wallet-self';
export const DEMO_TREASURY_WALLET_ID = 'demo-wallet-treasury';
export const DEMO_WALLET_ADDRESS = '0x11e0de11e0de11e0de11e0de11e0de11e0de11e0';
export const DEMO_BALANCE = '250.000000';
export const DEMO_PAYOUT_AMOUNT = '12.000000';
export const DEMO_POOL_WINNER = 'Arsenal';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursAhead(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function buildLedger(): Transaction[] {
  return [
    {
      id: 'demo-tx-1',
      sender_wallet: DEMO_WALLET_ID,
      receiver_wallet: 'demo-wallet-sam',
      amount: '12.500000',
      fee: '0.000000',
      currency: 'USDT',
      transaction_hash: '0xde100000000000000000000000000000000000000000000000000000000001',
      type: 'SEND',
      status: 'BROADCAST',
      reference_id: null,
      idempotency_key: 'demo-idem-1',
      memo: 'Transfer to @sam',
      created_at: hoursAgo(2),
      confirmed_at: null,
    },
    {
      id: 'demo-tx-2',
      sender_wallet: DEMO_WALLET_ID,
      receiver_wallet: 'demo-wallet-priya',
      amount: '9.000000',
      fee: '0.000000',
      currency: 'USDT',
      transaction_hash: '0xde100000000000000000000000000000000000000000000000000000000002',
      type: 'SPLIT_BILL',
      status: 'SUCCESS',
      reference_id: 'demo-split-1',
      idempotency_key: 'demo-idem-2',
      memo: 'Pizza night split',
      created_at: hoursAgo(26),
      confirmed_at: hoursAgo(25),
    },
    {
      id: 'demo-tx-3',
      sender_wallet: DEMO_WALLET_ID,
      receiver_wallet: 'demo-wallet-riya',
      amount: '5.000000',
      fee: '0.000000',
      currency: 'USDT',
      transaction_hash: '0xde100000000000000000000000000000000000000000000000000000000003',
      type: 'WATCH_PARTY',
      status: 'SUCCESS',
      reference_id: 'demo-party-1',
      idempotency_key: 'demo-idem-3',
      memo: 'Entry fee for Arsenal vs Tottenham',
      created_at: hoursAgo(50),
      confirmed_at: hoursAgo(49),
    },
    {
      id: 'demo-tx-4',
      sender_wallet: 'demo-wallet-priya',
      receiver_wallet: DEMO_WALLET_ID,
      amount: '3.000000',
      fee: '0.000000',
      currency: 'USDT',
      transaction_hash: '0xde100000000000000000000000000000000000000000000000000000000004',
      type: 'TIP',
      status: 'SUCCESS',
      reference_id: null,
      idempotency_key: 'demo-idem-4',
      memo: 'Great assist!',
      created_at: hoursAgo(74),
      confirmed_at: hoursAgo(73),
    },
    {
      id: 'demo-tx-5',
      sender_wallet: DEMO_WALLET_ID,
      receiver_wallet: DEMO_TREASURY_WALLET_ID,
      amount: '2.000000',
      fee: '0.000000',
      currency: 'USDT',
      transaction_hash: '0xde100000000000000000000000000000000000000000000000000000000005',
      type: 'POOL_ENTRY',
      status: 'SUCCESS',
      reference_id: 'demo-pool-1',
      idempotency_key: 'demo-idem-5',
      memo: 'Prediction pool entry: Arsenal vs Tottenham, pick Arsenal',
      created_at: hoursAgo(98),
      confirmed_at: hoursAgo(97),
    },
    {
      id: 'demo-tx-6',
      sender_wallet: 'demo-wallet-sam',
      receiver_wallet: DEMO_WALLET_ID,
      amount: '40.000000',
      fee: '0.000000',
      currency: 'USDT',
      transaction_hash: '0xde100000000000000000000000000000000000000000000000000000000006',
      type: 'SEND',
      status: 'SUCCESS',
      reference_id: null,
      idempotency_key: 'demo-idem-6',
      memo: 'Trip settle-up from @sam',
      created_at: hoursAgo(146),
      confirmed_at: hoursAgo(145),
    },
  ];
}

function buildParties(): WatchPartyView[] {
  return [
    {
      id: 'demo-party-1',
      title: 'Derby Night at The Dugout',
      match: 'Arsenal vs Tottenham',
      competition: 'Matchday',
      kickoffAt: hoursAhead(48),
      venue: 'The Dugout Sports Bar',
      city: 'Mumbai',
      host: 'Riya (demo host)',
      hostWallet: '0x22aa22aa22aa22aa22aa22aa22aa22aa22aa22aa',
      entryFee: '5.000000',
      capacity: 20,
      seatsTaken: 14,
      seatsLeft: 6,
      status: 'OPEN',
      organizerId: 'demo-user-riya',
      cover:
        'Demo screening at The Dugout Sports Bar, Mumbai. Sample data — your seat here is already paid.',
      perks: [
        'Reserved seat at The Dugout',
        'Live big-screen coverage with the crew',
        'Demo entry — nothing is charged',
      ],
      participants: [
        { id: 'demo-user-sam', name: 'Sam (demo)', team: '@sam', status: 'PAID' },
        { id: 'demo-user-priya', name: 'Priya (demo)', team: '@priya', status: 'PAID' },
        { id: 'demo-user-arjun', name: 'Arjun (demo)', team: '@arjun', status: 'PAID' },
      ],
    },
    {
      id: 'demo-party-2',
      title: 'El Clasico Rooftop Screening',
      match: 'Real Madrid vs Barcelona',
      competition: 'Matchday',
      kickoffAt: hoursAhead(120),
      venue: 'Skyline Rooftop',
      city: 'Bengaluru',
      host: 'Dev (demo host)',
      hostWallet: '0x33bb33bb33bb33bb33bb33bb33bb33bb33bb33bb',
      entryFee: '8.000000',
      capacity: 30,
      seatsTaken: 28,
      seatsLeft: 2,
      status: 'OPEN',
      organizerId: 'demo-user-dev',
      cover:
        'Demo screening at Skyline Rooftop, Bengaluru. Sample data — join to grab one of the last seats.',
      perks: [
        'Reserved rooftop seat',
        'Halftime snacks with the crew',
        'Demo entry — nothing is charged',
      ],
      participants: [
        { id: 'demo-user-lena', name: 'Lena (demo)', team: '@lena', status: 'PAID' },
        { id: 'demo-user-kabir', name: 'Kabir (demo)', team: '@kabir', status: 'PAID' },
      ],
    },
  ];
}

function buildPools(): PredictionPoolView[] {
  return [
    {
      id: 'demo-pool-1',
      match: 'Arsenal vs Tottenham',
      competition: 'Matchday pool',
      kickoffAt: hoursAhead(48),
      closesAt: hoursAhead(36),
      entryFee: '2.000000',
      prizePool: '24.000000',
      poolWallet: '0x44cc44cc44cc44cc44cc44cc44cc44cc44cc44cc',
      status: 'OPEN',
      winnerTeam: null,
      entries: 12,
      teams: [
        { id: 'Arsenal', name: 'Arsenal', shortName: 'ARS' },
        { id: 'Tottenham', name: 'Tottenham', shortName: 'TOT' },
      ],
    },
    {
      id: 'demo-pool-2',
      match: 'Man City vs Liverpool',
      competition: 'Matchday pool',
      kickoffAt: hoursAhead(96),
      closesAt: hoursAhead(90),
      entryFee: '1.000000',
      prizePool: '8.000000',
      poolWallet: '0x44cc44cc44cc44cc44cc44cc44cc44cc44cc44cc',
      status: 'OPEN',
      winnerTeam: null,
      entries: 8,
      teams: [
        { id: 'Man City', name: 'Man City', shortName: 'MAN' },
        { id: 'Liverpool', name: 'Liverpool', shortName: 'LIV' },
      ],
    },
  ];
}

/** Fresh, pristine demo state. Called on every enter/reset — one-click reset. */
export function buildDemoSnapshot(): DemoSnapshot {
  return {
    walletAddress: DEMO_WALLET_ADDRESS,
    walletId: DEMO_WALLET_ID,
    balance: DEMO_BALANCE,
    ledger: buildLedger(),
    parties: buildParties(),
    joinedPartyIds: ['demo-party-1'],
    pools: buildPools(),
  };
}
