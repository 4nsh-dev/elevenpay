/**
 * Copilot feature — dashboard insights, contextual nudges, conversational mode.
 * The AI fills forms; it never executes: every capability is a validated
 * structured tool call that is read-only or draft-preparing, and every
 * payment still goes through the WDK confirm sheet (keys stay on device).
 */
export { buildCopilotContext, type CopilotContext } from './context';
export { capabilitiesMessage, planToolCalls, type PlannerOutput } from './planner';
export {
  COPILOT_TOOLS,
  friendlyCopilotError,
  runToolCall,
  validateToolCall,
  type PartiesResult,
  type PartyRecommendation,
  type PoolRecommendation,
  type PoolsResult,
  type SpendingCategory,
  type SpendingResult,
  type SplitDraftResult,
  type ToolCall,
  type ToolDefinition,
  type ToolName,
  type ToolResult,
  type TransactionLine,
  type TransactionsResult,
  type TransferDraftResult,
} from './tools';
export { useCopilot, type CopilotMessage } from './use-copilot';
