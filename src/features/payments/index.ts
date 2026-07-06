/**
 * Payments feature - the universal pipeline every money flow runs through:
 * Intent -> Prepare (PaymentDraft) -> Approve (confirm sheet) -> Sign (WDK) -> Record (Supabase).
 */
export {
  extractRecipientAddressFromQr,
  sendMoneySchema,
  type SendMoneyFormValues,
} from './send-money';
