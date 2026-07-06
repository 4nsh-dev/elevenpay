import type { DemoRewardDraft, PaymentDraft, WalletTransaction } from '@/services/wdk';

export type PoolTeam = {
  id: string;
  name: string;
  shortName: string;
};

export type PoolParticipant = {
  id: string;
  name: string;
  pick: string;
  stake: string;
};

export type PredictionPool = {
  id: string;
  match: string;
  competition: string;
  kickoffAt: string;
  closesAt: string;
  entryFee: string;
  basePrizePool: string;
  poolWallet: string;
  teams: [PoolTeam, PoolTeam];
  participants: PoolParticipant[];
};

export const PREDICTION_POOLS: PredictionPool[] = [
  {
    id: 'england-brazil',
    match: 'England vs Brazil',
    competition: 'Legends Summer Cup',
    kickoffAt: '2026-07-13T20:00:00+01:00',
    closesAt: '2026-07-13T19:45:00+01:00',
    entryFee: '2.000000',
    basePrizePool: '18.000000',
    poolWallet: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    teams: [
      { id: 'england', name: 'England', shortName: 'ENG' },
      { id: 'brazil', name: 'Brazil', shortName: 'BRA' },
    ],
    participants: [
      { id: 'p1', name: 'Riya', pick: 'brazil', stake: '2.000000' },
      { id: 'p2', name: 'Noah', pick: 'england', stake: '2.000000' },
      { id: 'p3', name: 'Ishan', pick: 'brazil', stake: '2.000000' },
      { id: 'p4', name: 'Grace', pick: 'england', stake: '2.000000' },
    ],
  },
  {
    id: 'france-spain',
    match: 'France vs Spain',
    competition: 'Continental Final Demo',
    kickoffAt: '2026-07-14T21:00:00+02:00',
    closesAt: '2026-07-14T20:45:00+02:00',
    entryFee: '3.500000',
    basePrizePool: '24.500000',
    poolWallet: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    teams: [
      { id: 'france', name: 'France', shortName: 'FRA' },
      { id: 'spain', name: 'Spain', shortName: 'ESP' },
    ],
    participants: [
      { id: 'p1', name: 'Marta', pick: 'spain', stake: '3.500000' },
      { id: 'p2', name: 'Louis', pick: 'france', stake: '3.500000' },
      { id: 'p3', name: 'Adil', pick: 'france', stake: '3.500000' },
    ],
  },
  {
    id: 'argentina-germany',
    match: 'Argentina vs Germany',
    competition: 'World Classics Night',
    kickoffAt: '2026-07-15T18:30:00-03:00',
    closesAt: '2026-07-15T18:15:00-03:00',
    entryFee: '4.000000',
    basePrizePool: '32.000000',
    poolWallet: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
    teams: [
      { id: 'argentina', name: 'Argentina', shortName: 'ARG' },
      { id: 'germany', name: 'Germany', shortName: 'GER' },
    ],
    participants: [
      { id: 'p1', name: 'Sofia', pick: 'argentina', stake: '4.000000' },
      { id: 'p2', name: 'Jonas', pick: 'germany', stake: '4.000000' },
      { id: 'p3', name: 'Amir', pick: 'argentina', stake: '4.000000' },
      { id: 'p4', name: 'Lena', pick: 'germany', stake: '4.000000' },
      { id: 'p5', name: 'Diego', pick: 'argentina', stake: '4.000000' },
    ],
  },
];

function decimalToUnits(amount: string) {
  const [whole = '0', fraction = ''] = amount.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0').slice(0, 6));
}

function unitsToDecimal(units: bigint) {
  const whole = units / 1_000_000n;
  const fraction = (units % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${fraction}`;
}

export function getPredictionPool(id: string | undefined) {
  return PREDICTION_POOLS.find((pool) => pool.id === id) ?? null;
}

export function getTeam(pool: PredictionPool, teamId: string | null | undefined) {
  return pool.teams.find((team) => team.id === teamId) ?? null;
}

export function poolEntryTransaction(transactions: WalletTransaction[], poolId: string) {
  return transactions.find(
    (transaction) =>
      transaction.type === 'POOL_ENTRY' &&
      transaction.referenceId === poolId &&
      transaction.status === 'BROADCAST',
  );
}

export function poolRewardTransaction(transactions: WalletTransaction[], poolId: string) {
  return transactions.find(
    (transaction) =>
      transaction.type === 'POOL_REWARD' &&
      transaction.referenceId === poolId &&
      transaction.status === 'BROADCAST',
  );
}

export function joinedPick(transactions: WalletTransaction[], poolId: string) {
  return poolEntryTransaction(transactions, poolId)?.metadata?.pick ?? null;
}

export function participantCount(pool: PredictionPool, isJoined: boolean) {
  return pool.participants.length + (isJoined ? 1 : 0);
}

export function prizePoolAmount(pool: PredictionPool, isJoined: boolean) {
  const joinedStake = isJoined ? decimalToUnits(pool.entryFee) : 0n;
  return unitsToDecimal(decimalToUnits(pool.basePrizePool) + joinedStake);
}

export function buildPoolEntryDraft(pool: PredictionPool, pick: PoolTeam): PaymentDraft {
  return {
    to: pool.poolWallet,
    amount: pool.entryFee,
    type: 'POOL_ENTRY',
    referenceId: pool.id,
    memo: `Prediction pool entry: ${pool.match}, pick ${pick.name}`,
    metadata: { pick: pick.id, pickName: pick.name, match: pool.match },
  };
}

export function buildPoolRewardDraft(
  pool: PredictionPool,
  winner: PoolTeam,
  rewardAmount: string,
): DemoRewardDraft {
  return {
    amount: rewardAmount,
    type: 'POOL_REWARD',
    referenceId: pool.id,
    counterparty: pool.poolWallet,
    memo: `Demo reward for ${pool.match}: ${winner.name}`,
    metadata: { winner: winner.id, winnerName: winner.name, match: pool.match },
  };
}

export function formatPoolDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function countdownLabel(targetIso: string, now = new Date()) {
  const ms = new Date(targetIso).getTime() - now.getTime();
  if (ms <= 0) return 'Closed';

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function simulateWinner(pool: PredictionPool) {
  const seed = Array.from(pool.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pool.teams[seed % pool.teams.length] ?? pool.teams[0];
}
