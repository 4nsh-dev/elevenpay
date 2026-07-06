/**
 * Prediction pool feature - pools feed, entry, result simulation, demo payout.
 * Real escrow/reward distribution moves behind Supabase RPCs later.
 */
export {
  PREDICTION_POOLS,
  buildPoolEntryDraft,
  buildPoolRewardDraft,
  countdownLabel,
  formatPoolDate,
  getPredictionPool,
  getTeam,
  joinedPick,
  participantCount,
  poolEntryTransaction,
  poolRewardTransaction,
  prizePoolAmount,
  simulateWinner,
  type PoolTeam,
  type PredictionPool,
} from './prediction-pool-data';
