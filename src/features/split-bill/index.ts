/**
 * Split bill feature — create split (shares must sum), track legs, requests,
 * WDK payments, settle. Live Supabase implementation; see
 * docs/split-bill-supabase.md.
 */
export {
  aiCalculateShares,
  beginPaySplitLeg,
  confirmSplitLegPaid,
  createBill,
  formatMicroUsdt,
  friendlySplitError,
  loadSplitBoard,
  parseUsdt,
  searchFriends,
  validateBill,
} from './split-service';
export type {
  BillValidation,
  CreateSplitResult,
  OwedRequestView,
  ShareSuggestion,
  Split,
  SplitHistoryView,
  SplitLeg,
  SplitParticipant,
} from './split-service';
export { useSplitBoard } from './use-splits';
