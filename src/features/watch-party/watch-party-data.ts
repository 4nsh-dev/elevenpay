import { RESERVATION_WINDOW_MINUTES } from '@/lib/constants';
import type { PaymentDraft, WalletTransaction } from '@/services/wdk';

export type WatchPartyParticipant = {
  id: string;
  name: string;
  team: string;
  status: 'PAID' | 'RESERVED';
};

export type WatchParty = {
  id: string;
  title: string;
  match: string;
  competition: string;
  kickoffAt: string;
  venue: string;
  city: string;
  host: string;
  hostWallet: string;
  entryFee: string;
  capacity: number;
  cover: string;
  perks: string[];
  participants: WatchPartyParticipant[];
};

export const WATCH_PARTIES: WatchParty[] = [
  {
    id: 'el-clasico-nyc',
    title: 'El Clasico Rooftop Watch',
    match: 'Barcelona vs Real Madrid',
    competition: 'Club Friendly Night',
    kickoffAt: '2026-07-10T19:30:00-04:00',
    venue: 'Hudson Terrace',
    city: 'New York',
    host: 'NYC Culers Club',
    hostWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    entryFee: '8.500000',
    capacity: 24,
    cover: 'Rooftop screens, tapas table, and halftime skills challenge.',
    perks: ['Reserved seat', 'Halftime raffle', 'One soft drink'],
    participants: [
      { id: 'p1', name: 'Maya', team: 'Barcelona', status: 'PAID' },
      { id: 'p2', name: 'Leo', team: 'Real Madrid', status: 'PAID' },
      { id: 'p3', name: 'Aarav', team: 'Barcelona', status: 'RESERVED' },
      { id: 'p4', name: 'Nora', team: 'Real Madrid', status: 'PAID' },
      { id: 'p5', name: 'Sam', team: 'Barcelona', status: 'PAID' },
    ],
  },
  {
    id: 'london-derby',
    title: 'North London Derby Table',
    match: 'Arsenal vs Tottenham',
    competition: 'Premier League Weekend',
    kickoffAt: '2026-07-11T17:30:00+01:00',
    venue: 'The Crossbar Social',
    city: 'London',
    host: 'Gunners Matchday DAO',
    hostWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    entryFee: '6.000000',
    capacity: 18,
    cover: 'Big-screen derby room with shared snacks and prediction board.',
    perks: ['Reserved booth', 'Snack share', 'Prediction card'],
    participants: [
      { id: 'p1', name: 'Oliver', team: 'Arsenal', status: 'PAID' },
      { id: 'p2', name: 'Priya', team: 'Tottenham', status: 'PAID' },
      { id: 'p3', name: 'Theo', team: 'Arsenal', status: 'PAID' },
    ],
  },
  {
    id: 'miami-watch-night',
    title: 'Miami Ultras Watch Night',
    match: 'Inter Miami vs LAFC',
    competition: 'Summer Cup',
    kickoffAt: '2026-07-12T20:00:00-04:00',
    venue: 'Biscayne Fan Zone',
    city: 'Miami',
    host: '305 Football Club',
    hostWallet: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    entryFee: '5.250000',
    capacity: 32,
    cover: 'Outdoor projector, food truck wristband, and supporter chants.',
    perks: ['Fan zone entry', 'Food truck discount', 'Winner selfie wall'],
    participants: [
      { id: 'p1', name: 'Camila', team: 'Inter Miami', status: 'PAID' },
      { id: 'p2', name: 'Mateo', team: 'LAFC', status: 'RESERVED' },
      { id: 'p3', name: 'June', team: 'Inter Miami', status: 'PAID' },
      { id: 'p4', name: 'Eli', team: 'Inter Miami', status: 'PAID' },
      { id: 'p5', name: 'Rafa', team: 'LAFC', status: 'PAID' },
      { id: 'p6', name: 'Zoe', team: 'Inter Miami', status: 'PAID' },
    ],
  },
];

export function getWatchParty(id: string | undefined) {
  return WATCH_PARTIES.find((party) => party.id === id) ?? null;
}

export function paidParticipantCount(party: WatchParty, isJoined: boolean) {
  const baseCount = party.participants.filter(
    (participant) => participant.status === 'PAID',
  ).length;
  return isJoined ? baseCount + 1 : baseCount;
}

export function reservedParticipantCount(party: WatchParty) {
  return party.participants.filter((participant) => participant.status === 'RESERVED').length;
}

export function availableSeats(party: WatchParty, isJoined: boolean) {
  return Math.max(0, party.capacity - paidParticipantCount(party, isJoined));
}

export function isWatchPartyJoined(transactions: WalletTransaction[], partyId: string) {
  return transactions.some(
    (transaction) =>
      transaction.type === 'WATCH_PARTY' &&
      transaction.referenceId === partyId &&
      transaction.status === 'BROADCAST',
  );
}

export function buildWatchPartyDraft(party: WatchParty): PaymentDraft {
  return {
    to: party.hostWallet,
    amount: party.entryFee,
    type: 'WATCH_PARTY',
    referenceId: party.id,
    memo: `Entry fee for ${party.match}`,
  };
}

export function formatPartyTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function reservationLabel() {
  return `${RESERVATION_WINDOW_MINUTES}-minute reservation`;
}
