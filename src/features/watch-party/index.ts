/**
 * Watch party feature - discovery, seat reservation, join payment, ticket.
 * Backend persistence will move behind this slice when Supabase RPCs exist.
 */
export {
  WATCH_PARTIES,
  availableSeats,
  buildWatchPartyDraft,
  formatPartyTime,
  getWatchParty,
  isWatchPartyJoined,
  paidParticipantCount,
  reservationLabel,
  reservedParticipantCount,
  type WatchParty,
  type WatchPartyParticipant,
} from './watch-party-data';
