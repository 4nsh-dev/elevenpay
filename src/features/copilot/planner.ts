/**
 * On-device planner — turns an utterance plus wallet context into structured
 * tool calls against COPILOT_TOOLS. Deterministic and offline by design: no
 * free-text generation, no key access, no off-domain chat. Because the
 * contract is standard function-calling JSON (tools + calls), a hosted LLM
 * planner can replace planToolCalls without touching the executor or the UI.
 */

import type { CopilotContext } from './context';
import type { ToolCall, ToolName } from './tools';

export type PlannerOutput =
  | { type: 'tool_calls'; preamble: string; calls: ToolCall[] }
  | { type: 'say'; message: string }
  | { type: 'refuse'; message: string };

let callCounter = 0;

function makeCall(name: ToolName, args: Record<string, unknown>): ToolCall {
  callCounter += 1;
  return { id: `call-${Date.now().toString(36)}-${callCounter}`, name, arguments: args };
}

function extractAmount(text: string): string | null {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

function extractHandles(text: string): string[] {
  return Array.from(text.matchAll(/@([a-zA-Z0-9_]+)/g)).map((match) => match[1]);
}

function extractMemo(text: string): string {
  const match = text.match(/\bfor\s+(.{3,60})$/i);
  return match ? match[1].trim() : '';
}

/** Contextual capability card — grounded in the live wallet snapshot. */
export function capabilitiesMessage(context: CopilotContext | null): string {
  const hello = context?.firstName ? `Hey ${context.firstName} — ` : '';
  const balance = context?.balance ? ` You have ${context.balance} USDT cached.` : '';
  return (
    `${hello}I am your ElevenPay copilot. I can explain your spending, summarize transactions, ` +
    `prepare transfers ("send 5 to @sam"), prepare split bills ("split 30 with @sam @priya for pizza"), ` +
    `and recommend watch parties or prediction pools.${balance} I prepare drafts only — ` +
    `you approve every payment in the confirm sheet.`
  );
}

const REFUSAL =
  'I am a wallet copilot, not a general chatbot — I only work with your ElevenPay money. ' +
  'Try "explain my spending", "summarize my last 10 transactions", "send 5 to @sam", ' +
  '"split 30 with @sam @priya", "recommend watch parties", or "recommend prediction pools".';

export function planToolCalls(utterance: string, context: CopilotContext): PlannerOutput {
  const text = utterance.trim();
  const lower = text.toLowerCase();
  if (!text) return { type: 'say', message: capabilitiesMessage(context) };

  // Greetings / help — answer with the capability card, never small talk.
  if (/^(hi|hey|hello|yo\b|help|what can you)/.test(lower)) {
    return { type: 'say', message: capabilitiesMessage(context) };
  }

  // 1) Split bills (checked before transfers: "split" beats "pay/send").
  if (/\bsplit\b/.test(lower)) {
    const amount = extractAmount(lower);
    if (!amount) {
      return {
        type: 'say',
        message: 'Tell me the total, e.g. "Split 45 USDT with @sam and @priya for pizza".',
      };
    }
    const handles = extractHandles(text);
    return {
      type: 'tool_calls',
      preamble: handles.length
        ? 'Drafting the split and asking the share assistant for exact amounts…'
        : 'Drafting the split — no @usernames given, so add friends on the Split screen.',
      calls: [
        makeCall('prepare_split_bill', {
          total: amount,
          usernames: handles.join(','),
          memo: extractMemo(text),
        }),
      ],
    };
  }

  // 2) Transfers.
  if (/\b(send|transfer|pay)\b/.test(lower)) {
    const amount = extractAmount(lower);
    const handles = extractHandles(text);
    const toWord = lower.match(/\b(?:to|pay)\s+@?([a-z0-9_]+)/);
    const to = handles[0] ?? (toWord && !/^\d/.test(toWord[1]) ? toWord[1] : null);
    if (!amount || !to) {
      return {
        type: 'say',
        message: 'Give me both pieces, e.g. "Send 5 USDT to @sam for chai".',
      };
    }
    const memo = extractMemo(text);
    const args: Record<string, unknown> = { to, amount };
    if (memo) args.memo = memo;
    return {
      type: 'tool_calls',
      preamble: `Preparing a transfer draft to @${to} — you sign it (or discard it) in the confirm sheet.`,
      calls: [makeCall('prepare_transfer', args)],
    };
  }

  // 3) Spending explanations.
  if (/(spend|spending|expens|cost|budget|money go|money went|where.*(money|usdt))/.test(lower)) {
    const period = /today/.test(lower) ? 'today' : /month/.test(lower) ? 'month' : 'week';
    return {
      type: 'tool_calls',
      preamble: `Crunching your outgoing ledger for the ${period === 'today' ? 'day' : period}…`,
      calls: [makeCall('explain_spending', { period })],
    };
  }

  // 4) Transaction summaries.
  if (/(summar|recent|history|transaction|activity|ledger|last \d+)/.test(lower)) {
    const limitMatch = lower.match(/(\d+)/);
    const args: Record<string, unknown> = {};
    if (limitMatch) args.limit = Number(limitMatch[1]);
    if (/(incoming|received|money in)/.test(lower)) args.direction = 'in';
    else if (/(outgoing|sent|money out)/.test(lower)) args.direction = 'out';
    return {
      type: 'tool_calls',
      preamble: 'Reading your ledger…',
      calls: [makeCall('summarize_transactions', args)],
    };
  }

  // 5) Recommendations — parties, pools, or both in one turn.
  const wantsParties = /(watch|party|parties|screening)/.test(lower);
  const wantsPools = /(pool|predict|bet|wager)/.test(lower);
  if (wantsParties && wantsPools) {
    return {
      type: 'tool_calls',
      preamble: 'Checking parties and pools that are open right now…',
      calls: [
        makeCall('recommend_watch_parties', { limit: 3 }),
        makeCall('recommend_prediction_pools', { limit: 3 }),
      ],
    };
  }
  if (wantsParties) {
    return {
      type: 'tool_calls',
      preamble: 'Scanning upcoming watch parties with open seats…',
      calls: [makeCall('recommend_watch_parties', { limit: 3 })],
    };
  }
  if (wantsPools) {
    return {
      type: 'tool_calls',
      preamble: 'Scanning open prediction pools…',
      calls: [makeCall('recommend_prediction_pools', { limit: 3 })],
    };
  }

  // 6) "What should I do tonight" style — recommend both, grounded in context.
  if (/(tonight|weekend|recommend|suggest|what should i)/.test(lower)) {
    return {
      type: 'tool_calls',
      preamble: 'Looking at what is open right now…',
      calls: [
        makeCall('recommend_watch_parties', { limit: 3 }),
        makeCall('recommend_prediction_pools', { limit: 3 }),
      ],
    };
  }

  // Everything else is out of scope — this is not a general chatbot.
  return { type: 'refuse', message: REFUSAL };
}
