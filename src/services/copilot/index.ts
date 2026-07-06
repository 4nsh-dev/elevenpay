import { z } from 'zod';

/**
 * Copilot client — talks to the `ai-copilot` edge function.
 * The AI fills forms; it never executes. Every intent is validated against
 * this schema before it may prefill a Review screen (docs/api-contracts.md §8).
 */

export const intentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SEND'),
    recipientUsername: z.string(),
    amount: z.string(),
    memo: z.string().optional(),
  }),
  z.object({
    type: z.literal('SPLIT_BILL'),
    totalAmount: z.string(),
    memberUsernames: z.array(z.string()).min(1).max(20),
    memo: z.string().optional(),
  }),
  z.object({ type: z.literal('POOL_ENTRY'), poolId: z.string(), selectedTeam: z.string() }),
  z.object({ type: z.literal('WATCH_PARTY'), partyId: z.string() }),
]);

export type CopilotIntent = z.infer<typeof intentSchema>;

export interface CopilotReply {
  reply: string;
  intent: CopilotIntent | null;
}

export async function askCopilot(_message: string, _screen: string): Promise<CopilotReply> {
  throw new Error('askCopilot not implemented — AI phase');
}
