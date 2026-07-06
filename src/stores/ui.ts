import { create } from 'zustand';

import type { PaymentDraft } from '@/services/wdk';

/**
 * Ephemeral UI state. `pendingDraft` is the handoff between AI/taps and the
 * universal confirm sheet — everything except a signature.
 */
interface UiState {
  pendingDraft: PaymentDraft | null;
  isCopilotOpen: boolean;
  setPendingDraft: (draft: PaymentDraft | null) => void;
  setCopilotOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  pendingDraft: null,
  isCopilotOpen: false,
  setPendingDraft: (pendingDraft) => set({ pendingDraft }),
  setCopilotOpen: (isCopilotOpen) => set({ isCopilotOpen }),
}));
