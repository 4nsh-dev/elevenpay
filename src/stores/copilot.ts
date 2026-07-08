import { create } from 'zustand';

import type { SplitParticipant } from '@/features/split-bill';

/**
 * Copilot handoff state — drafts the AI prepared that another screen picks
 * up. Drafts only: nothing in here is signed or submitted without the user.
 * (Transfer drafts reuse the existing useUiStore pendingDraft -> /confirm
 * path; this store carries the split-bill prefill to /split.)
 */
export type SplitPrefill = {
  total: string;
  memo: string;
  participants: SplitParticipant[];
};

interface CopilotState {
  splitPrefill: SplitPrefill | null;
  setSplitPrefill: (splitPrefill: SplitPrefill) => void;
  clearSplitPrefill: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  splitPrefill: null,
  setSplitPrefill: (splitPrefill) => set({ splitPrefill }),
  clearSplitPrefill: () => set({ splitPrefill: null }),
}));
