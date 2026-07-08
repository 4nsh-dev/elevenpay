/**
 * Copilot tool registry — structured function calling.
 *
 * COPILOT_TOOLS is the JSON tools contract (the exact shape a hosted LLM
 * would receive); the planner emits ToolCall objects against it and
 * runToolCall validates every argument before executing. Every tool is
 * read-only or draft-preparing: nothing here signs, broadcasts, or reads
 * private keys. Money only ever moves after the user approves a draft in
 * the WDK confirm sheet.
 */

import { countdownLabel, listPools } from '@/features/prediction-pool';
import {
  aiCalculateShares,
  formatMicroUsdt,
  parseUsdt,
  searchFriends,
  type SplitParticipant,
} from '@/features/split-bill';
import { formatPartyTime, listParties } from '@/features/watch-party';
import {
  listMyTransactions,
  type Transaction,
} from '@/services/supabase/repositories/transactions';
import { resolveRecipient } from '@/services/supabase/repositories/wallets';
import type { PaymentDraft } from '@/services/wdk';

import { demoLedgerRows, isDemoModeActive } from '@/features/demo';

import type { CopilotContext } from './context';

export type ToolName =
  | 'explain_spending'
  | 'summarize_transactions'
  | 'prepare_transfer'
  | 'prepare_split_bill'
  | 'recommend_watch_parties'
  | 'recommend_prediction_pools';

export type ToolCall = {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
};

export type ToolParameterSpec = {
  type: 'string' | 'number';
  description: string;
  enum?: string[];
};

export type ToolDefinition = {
  name: ToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterSpec>;
    required: string[];
  };
};

/** The function-calling contract. A hosted LLM planner would receive exactly this. */
export const COPILOT_TOOLS: ToolDefinition[] = [
  {
    name: 'explain_spending',
    description: 'Break down the user outgoing USDT by category for a time period.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time window to analyze.',
          enum: ['today', 'week', 'month'],
        },
      },
      required: [],
    },
  },
  {
    name: 'summarize_transactions',
    description: 'Summarize the most recent ledger activity (incoming and outgoing).',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'How many transactions to include (1-25).' },
        direction: {
          type: 'string',
          description: 'Filter by direction.',
          enum: ['in', 'out', 'all'],
        },
      },
      required: [],
    },
  },
  {
    name: 'prepare_transfer',
    description:
      'Prepare (never send) a USDT transfer draft to a username for the WDK confirm sheet.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient @username.' },
        amount: {
          type: 'string',
          description: 'USDT amount as a decimal string, e.g. "12.50".',
        },
        memo: { type: 'string', description: 'Optional note shown on the payment.' },
      },
      required: ['to', 'amount'],
    },
  },
  {
    name: 'prepare_split_bill',
    description:
      'Prepare (never create) a split-bill draft with AI-assigned shares for the Split screen.',
    parameters: {
      type: 'object',
      properties: {
        total: { type: 'string', description: 'Total bill in USDT as a decimal string.' },
        usernames: {
          type: 'string',
          description: 'Comma-separated @usernames; unknown names become guests.',
        },
        memo: { type: 'string', description: 'Optional bill memo, e.g. "Derby night pizza".' },
      },
      required: ['total'],
    },
  },
  {
    name: 'recommend_watch_parties',
    description: 'Recommend joinable upcoming watch parties, grounded in balance and seats.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum recommendations (default 3).' },
      },
      required: [],
    },
  },
  {
    name: 'recommend_prediction_pools',
    description: 'Recommend open prediction pools, grounded in balance and closing time.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum recommendations (default 3).' },
      },
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Typed results (one shape per capability; the UI renders these as cards)
// ---------------------------------------------------------------------------

export type SpendingCategory = {
  key: string;
  label: string;
  amount: string;
  percent: number;
  count: number;
};

export type SpendingResult = {
  kind: 'spending';
  period: 'today' | 'week' | 'month';
  total: string;
  categories: SpendingCategory[];
  insight: string;
};

export type TransactionLine = {
  id: string;
  direction: 'in' | 'out';
  label: string;
  amount: string;
  status: string;
  when: string;
  memo: string | null;
};

export type TransactionsResult = {
  kind: 'transactions';
  lines: TransactionLine[];
  totalIn: string;
  totalOut: string;
  summary: string;
};

export type TransferDraftResult = {
  kind: 'transfer_draft';
  /** Unsigned. Signing happens only in the WDK confirm sheet. */
  draft: PaymentDraft;
  recipient: string;
  summary: string;
};

export type SplitDraftResult = {
  kind: 'split_draft';
  total: string;
  memo: string;
  participants: SplitParticipant[];
  explanation: string;
  unresolved: string[];
  summary: string;
};

export type PartyRecommendation = {
  id: string;
  title: string;
  match: string;
  when: string;
  entryFee: string;
  seatsLeft: number;
  reason: string;
};

export type PoolRecommendation = {
  id: string;
  match: string;
  closes: string;
  entryFee: string;
  prizePool: string;
  entries: number;
  reason: string;
};

export type PartiesResult = {
  kind: 'parties';
  items: PartyRecommendation[];
  summary: string;
};

export type PoolsResult = {
  kind: 'pools';
  items: PoolRecommendation[];
  summary: string;
};

export type ToolResult =
  | SpendingResult
  | TransactionsResult
  | TransferDraftResult
  | SplitDraftResult
  | PartiesResult
  | PoolsResult;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  SEND: 'Transfers',
  SPLIT_BILL: 'Split bills',
  WATCH_PARTY: 'Watch parties',
  POOL_ENTRY: 'Pool entries',
  TIP: 'Tips',
};

function categoryLabel(type: string): string {
  return CATEGORY_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

function periodStart(period: 'today' | 'week' | 'month'): number {
  const now = new Date();
  if (period === 'today') {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime();
  }
  const days = period === 'week' ? 7 : 30;
  return now.getTime() - days * 24 * 60 * 60 * 1000;
}

function amountMicro(row: Transaction): bigint {
  return parseUsdt(row.amount) ?? 0n;
}

function shortWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function clampLimit(value: unknown, fallback: number, max: number): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(Math.max(num, 1), max);
}

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------

async function runExplainSpending(
  args: Record<string, unknown>,
  context: CopilotContext,
): Promise<SpendingResult> {
  const period = (args.period as SpendingResult['period']) ?? 'week';
  const rows = isDemoModeActive() ? demoLedgerRows() : await listMyTransactions({ limit: 100 });
  const since = periodStart(period);

  const outgoing = rows.filter(
    (row) =>
      row.sender_wallet !== null &&
      row.sender_wallet === context.walletId &&
      row.status !== 'FAILED' &&
      new Date(row.created_at).getTime() >= since,
  );

  const buckets = new Map<string, { amount: bigint; count: number }>();
  let totalMicro = 0n;
  for (const row of outgoing) {
    const micro = amountMicro(row);
    totalMicro += micro;
    const bucket = buckets.get(row.type) ?? { amount: 0n, count: 0 };
    bucket.amount += micro;
    bucket.count += 1;
    buckets.set(row.type, bucket);
  }

  const categories: SpendingCategory[] = Array.from(buckets.entries())
    .map(([key, bucket]) => ({
      key,
      label: categoryLabel(key),
      amount: formatMicroUsdt(bucket.amount),
      percent: totalMicro > 0n ? Number((bucket.amount * 1000n) / totalMicro) / 10 : 0,
      count: bucket.count,
    }))
    .sort((a, b) => {
      const diff = (parseUsdt(b.amount) ?? 0n) - (parseUsdt(a.amount) ?? 0n);
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });

  const periodLabel =
    period === 'today' ? 'today' : period === 'week' ? 'over the last 7 days' : 'over the last 30 days';

  let insight: string;
  if (outgoing.length === 0) {
    insight = `No outgoing payments ${periodLabel} — nothing to explain yet.`;
  } else {
    const top = categories[0];
    insight = `You spent ${formatMicroUsdt(totalMicro)} USDT across ${outgoing.length} payments ${periodLabel}; ${top.label} leads at ${top.amount} USDT (${top.percent}%).`;
    if (context.balance) {
      insight += ` Cached balance: ${context.balance} USDT.`;
    }
  }

  return {
    kind: 'spending',
    period,
    total: formatMicroUsdt(totalMicro),
    categories,
    insight,
  };
}

async function runSummarizeTransactions(
  args: Record<string, unknown>,
  context: CopilotContext,
): Promise<TransactionsResult> {
  const limit = clampLimit(args.limit, 10, 25);
  const direction = (args.direction as 'in' | 'out' | 'all') ?? 'all';
  const rows = isDemoModeActive() ? demoLedgerRows() : await listMyTransactions({ limit: 50 });

  const lines: TransactionLine[] = [];
  let totalIn = 0n;
  let totalOut = 0n;

  for (const row of rows) {
    const dir: 'in' | 'out' = row.sender_wallet === context.walletId ? 'out' : 'in';
    if (direction !== 'all' && dir !== direction) continue;
    if (lines.length >= limit) break;
    if (row.status !== 'FAILED') {
      if (dir === 'out') totalOut += amountMicro(row);
      else totalIn += amountMicro(row);
    }
    lines.push({
      id: row.id,
      direction: dir,
      label: categoryLabel(row.type),
      amount: row.amount,
      status: row.status,
      when: shortWhen(row.created_at),
      memo: row.memo,
    });
  }

  const summary =
    lines.length === 0
      ? 'No transactions recorded yet — your ledger is empty.'
      : `${lines.length} transactions: ${formatMicroUsdt(totalIn)} USDT in, ${formatMicroUsdt(totalOut)} USDT out (failed rows excluded from totals).`;

  return {
    kind: 'transactions',
    lines,
    totalIn: formatMicroUsdt(totalIn),
    totalOut: formatMicroUsdt(totalOut),
    summary,
  };
}

async function runPrepareTransfer(
  args: Record<string, unknown>,
  context: CopilotContext,
): Promise<TransferDraftResult> {
  if (isDemoModeActive()) {
    throw new Error(
      'VALIDATION_ERROR: Demo mode is on - transfers are disabled so nothing real can move. Exit demo first.',
    );
  }

  const handle = String(args.to ?? '')
    .trim()
    .replace(/^@/, '');
  const micro = parseUsdt(String(args.amount ?? '').trim());

  if (!handle) throw new Error('VALIDATION_ERROR: tell me who to pay, e.g. "@sam".');
  if (micro === null || micro <= 0n) {
    throw new Error('VALIDATION_ERROR: the amount must be a positive USDT value like "12.50".');
  }

  const recipient = await resolveRecipient(handle);
  if (!recipient) {
    throw new Error(`NOT_FOUND: no user "@${handle}" with a payable wallet was found.`);
  }
  if (context.userId && recipient.user_id === context.userId) {
    throw new Error('VALIDATION_ERROR: that is your own wallet — pick someone else.');
  }

  const amount = formatMicroUsdt(micro);
  const memoRaw = typeof args.memo === 'string' ? args.memo.trim() : '';
  const name = recipient.username ?? handle;

  // Unsigned draft. The confirm sheet is the only place signing can happen.
  const draft: PaymentDraft = {
    to: recipient.wallet_address,
    amount,
    type: 'SEND',
    memo: memoRaw || `Transfer to @${name}`,
  };

  const balanceMicro = context.balance ? parseUsdt(context.balance) : null;
  const lowBalance = balanceMicro !== null && micro > balanceMicro;
  const summary = lowBalance
    ? `Draft ready: ${amount} USDT to @${name}. Heads up — that is more than your cached balance of ${context.balance} USDT.`
    : `Draft ready: ${amount} USDT to @${name}. Nothing moves until you approve it in the confirm sheet.`;

  return { kind: 'transfer_draft', draft, recipient: `@${name}`, summary };
}

async function runPrepareSplitBill(
  args: Record<string, unknown>,
  context: CopilotContext,
): Promise<SplitDraftResult> {
  if (isDemoModeActive()) {
    throw new Error(
      'VALIDATION_ERROR: Demo mode is on - split bills are disabled in the sandbox. Exit demo first.',
    );
  }

  const totalMicro = parseUsdt(String(args.total ?? '').trim());
  if (totalMicro === null || totalMicro <= 0n) {
    throw new Error('VALIDATION_ERROR: the split total must be a positive USDT value.');
  }

  const handles = String(args.usernames ?? '')
    .split(/[,\s]+/)
    .map((handle) => handle.trim().replace(/^@/, ''))
    .filter(Boolean);

  const participants: SplitParticipant[] = [
    { key: 'self', kind: 'self', displayName: 'You', share: '', locked: false },
  ];
  const unresolved: string[] = [];

  for (const handle of handles) {
    const matches = await searchFriends(handle).catch(() => []);
    const hit =
      matches.find(
        (profile) => (profile.username ?? '').toLowerCase() === handle.toLowerCase(),
      ) ?? matches[0];
    if (hit && hit.id !== context.userId) {
      participants.push({
        key: `friend-${hit.id}`,
        kind: 'friend',
        displayName: hit.full_name ?? `@${hit.username ?? handle}`,
        userId: hit.id,
        username: hit.username,
        share: '',
        locked: false,
      });
    } else {
      unresolved.push(handle);
      participants.push({
        key: `guest-${handle}-${Date.now()}`,
        kind: 'guest',
        displayName: handle,
        share: '',
        locked: false,
      });
    }
  }

  if (participants.length === 1) {
    throw new Error(
      'VALIDATION_ERROR: add at least one friend or guest, e.g. "split 30 with @sam".',
    );
  }

  const total = formatMicroUsdt(totalMicro);
  const suggestion = aiCalculateShares(total, participants);
  if (!suggestion.ok) throw new Error(`VALIDATION_ERROR: ${suggestion.error}`);

  const withShares = participants.map((participant) => ({
    ...participant,
    share: suggestion.shares[participant.key] ?? participant.share,
  }));

  const memo = typeof args.memo === 'string' ? args.memo.trim() : '';
  const summary = `Split draft ready: ${total} USDT across ${withShares.length} people. Open it in Split Bill to review and send the requests.`;

  return {
    kind: 'split_draft',
    total,
    memo,
    participants: withShares,
    explanation: suggestion.explanation,
    unresolved,
    summary,
  };
}

async function runRecommendParties(
  args: Record<string, unknown>,
  context: CopilotContext,
): Promise<PartiesResult> {
  const limit = clampLimit(args.limit, 3, 5);
  const board = await listParties();
  const joined = new Set(board.joinedPartyIds);
  const balanceMicro = context.balance ? parseUsdt(context.balance) : null;

  const candidates = board.parties
    .filter((party) => party.seatsLeft > 0 && !joined.has(party.id))
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  const items: PartyRecommendation[] = candidates.slice(0, limit).map((party) => {
    const feeMicro = parseUsdt(party.entryFee) ?? 0n;
    let reason = 'Kicks off soonest of your open options.';
    if (party.seatsLeft <= 3) {
      reason = `Only ${party.seatsLeft} seats left — filling fast.`;
    } else if (balanceMicro !== null && feeMicro > balanceMicro) {
      reason = 'Entry fee is above your cached balance.';
    } else if (balanceMicro !== null) {
      reason = 'Fits your balance and has open seats.';
    }
    return {
      id: party.id,
      title: party.title,
      match: party.match,
      when: formatPartyTime(party.kickoffAt),
      entryFee: party.entryFee,
      seatsLeft: party.seatsLeft,
      reason,
    };
  });

  const summary =
    items.length === 0
      ? 'No joinable watch parties right now — check back closer to matchday.'
      : `${items.length} watch parties you could join, soonest first.`;

  return { kind: 'parties', items, summary };
}

async function runRecommendPools(
  args: Record<string, unknown>,
  context: CopilotContext,
): Promise<PoolsResult> {
  const limit = clampLimit(args.limit, 3, 5);
  const board = await listPools();
  const balanceMicro = context.balance ? parseUsdt(context.balance) : null;

  const candidates = board.pools
    .filter((pool) => pool.status === 'OPEN' && !board.joinedPoolIds.has(pool.id))
    .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());

  const items: PoolRecommendation[] = candidates.slice(0, limit).map((pool) => {
    const feeMicro = parseUsdt(pool.entryFee) ?? 0n;
    let reason = `Closes in ${countdownLabel(pool.closesAt)}.`;
    if (pool.entries >= 5) {
      reason = `${pool.entries} entries already in — the pot is building.`;
    } else if (balanceMicro !== null && feeMicro > balanceMicro) {
      reason = 'Entry fee is above your cached balance.';
    }
    return {
      id: pool.id,
      match: pool.match,
      closes: countdownLabel(pool.closesAt),
      entryFee: pool.entryFee,
      prizePool: pool.prizePool,
      entries: pool.entries,
      reason,
    };
  });

  const summary =
    items.length === 0
      ? 'No open prediction pools right now — new ones appear before kickoff.'
      : `${items.length} open pools, closing soonest first.`;

  return { kind: 'pools', items, summary };
}

// ---------------------------------------------------------------------------
// Validation + dispatch
// ---------------------------------------------------------------------------

function definitionFor(name: ToolName): ToolDefinition {
  const def = COPILOT_TOOLS.find((tool) => tool.name === name);
  if (!def) throw new Error(`VALIDATION_ERROR: unknown tool "${name}".`);
  return def;
}

/** Rejects calls that do not match the tool's JSON-schema contract. */
export function validateToolCall(call: ToolCall): void {
  const def = definitionFor(call.name);
  for (const key of def.parameters.required) {
    const value = call.arguments[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`VALIDATION_ERROR: "${call.name}" needs the "${key}" argument.`);
    }
  }
  for (const [key, value] of Object.entries(call.arguments)) {
    if (value === undefined) continue;
    const spec = def.parameters.properties[key];
    if (!spec) {
      throw new Error(`VALIDATION_ERROR: "${key}" is not an argument of "${call.name}".`);
    }
    if (spec.type === 'number' && typeof value !== 'number') {
      throw new Error(`VALIDATION_ERROR: "${key}" must be a number.`);
    }
    if (spec.type === 'string' && typeof value !== 'string') {
      throw new Error(`VALIDATION_ERROR: "${key}" must be a string.`);
    }
    if (spec.enum && typeof value === 'string' && !spec.enum.includes(value)) {
      throw new Error(`VALIDATION_ERROR: "${key}" must be one of ${spec.enum.join(', ')}.`);
    }
  }
}

/** Validates and executes one structured tool call. Read-only or draft-only. */
export async function runToolCall(call: ToolCall, context: CopilotContext): Promise<ToolResult> {
  validateToolCall(call);
  switch (call.name) {
    case 'explain_spending':
      return runExplainSpending(call.arguments, context);
    case 'summarize_transactions':
      return runSummarizeTransactions(call.arguments, context);
    case 'prepare_transfer':
      return runPrepareTransfer(call.arguments, context);
    case 'prepare_split_bill':
      return runPrepareSplitBill(call.arguments, context);
    case 'recommend_watch_parties':
      return runRecommendParties(call.arguments, context);
    case 'recommend_prediction_pools':
      return runRecommendPools(call.arguments, context);
    default:
      throw new Error('VALIDATION_ERROR: unsupported tool.');
  }
}

/** Maps stable error prefixes (and common failures) to friendly copy. */
export function friendlyCopilotError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const prefixes = ['VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHENTICATED', 'FORBIDDEN', 'CONFLICT'];
  for (const prefix of prefixes) {
    if (message.startsWith(`${prefix}:`)) return message.slice(prefix.length + 1).trim();
  }
  if (message.includes('Network request failed')) {
    return 'You appear to be offline — I need a connection to read your ledger.';
  }
  return 'Something went wrong running that — try again.';
}
