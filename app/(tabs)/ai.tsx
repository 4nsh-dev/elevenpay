import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  ChevronRight,
  PieChart,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trophy,
  Tv,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { InsightCard } from '@/components/ai';
import { GlassCard, PrimaryButton, Screen, TextField } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import {
  useCopilot,
  type CopilotMessage,
  type PartiesResult,
  type PoolsResult,
  type SpendingResult,
  type SplitDraftResult,
  type ToolCall,
  type ToolResult,
  type TransactionsResult,
  type TransferDraftResult,
} from '@/features/copilot';
import { formatUsdt } from '@/lib/format';
import { useCopilotStore } from '@/stores/copilot';
import { useUiStore } from '@/stores/ui';
import { colors, iconSize } from '@/theme/tokens';

/** Structured function calling, made visible: one chip per tool call. */
function ToolCallChip({ call }: { call: ToolCall }) {
  return (
    <View className="flex-row items-center gap-2 self-start rounded-input border border-white/10 bg-surface-card px-3 py-2">
      <Wrench size={iconSize.inline} color={colors.text.secondary} strokeWidth={2} />
      <Text className="font-inter text-[12px] text-content-secondary">
        {call.name}({JSON.stringify(call.arguments)})
      </Text>
    </View>
  );
}

function CardHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
      <Text className="font-inter-medium text-[13px] text-brand-primary">{title}</Text>
    </View>
  );
}

function SpendingCard({ result }: { result: SpendingResult }) {
  return (
    <GlassCard>
      <CardHeader icon={PieChart} title={`Spending — ${result.period}`} />
      <Text className="mt-2 font-inter text-[15px] leading-[22px] text-content-primary">
        {result.insight}
      </Text>
      {result.categories.length ? (
        <View className="mt-4 gap-3">
          {result.categories.map((category) => (
            <View key={category.key} className="flex-row items-center justify-between">
              <View>
                <Text className="font-inter-medium text-[14px] text-content-primary">
                  {category.label}
                </Text>
                <Text className="font-inter text-[12px] text-content-secondary">
                  {category.count} payments • {category.percent}%
                </Text>
              </View>
              <Text className="font-inter-semibold text-[14px] text-content-primary">
                {formatUsdt(category.amount)} USDT
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}

function TransactionsCard({ result }: { result: TransactionsResult }) {
  return (
    <GlassCard>
      <CardHeader icon={Receipt} title="Transactions" />
      <Text className="mt-2 font-inter text-[14px] leading-[20px] text-content-secondary">
        {result.summary}
      </Text>
      <View className="mt-4 gap-3">
        {result.lines.map((line) => (
          <View key={line.id} className="flex-row items-center gap-3">
            {line.direction === 'out' ? (
              <ArrowUpRight size={iconSize.inline} color={colors.text.secondary} strokeWidth={2} />
            ) : (
              <ArrowDownLeft size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
            )}
            <View className="flex-1">
              <Text className="font-inter-medium text-[14px] text-content-primary">
                {line.memo ?? line.label}
              </Text>
              <Text className="font-inter text-[12px] text-content-secondary">
                {line.when} • {line.status}
              </Text>
            </View>
            <Text className="font-inter-semibold text-[14px] text-content-primary">
              {line.direction === 'out' ? '-' : '+'}
              {formatUsdt(line.amount)}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function TransferCard({
  result,
  onReview,
}: {
  result: TransferDraftResult;
  onReview: () => void;
}) {
  return (
    <GlassCard>
      <CardHeader icon={ArrowUpRight} title="Transfer draft" />
      <Text className="mt-2 font-inter text-[14px] leading-[20px] text-content-secondary">
        {result.summary}
      </Text>
      <View className="mt-4 gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-inter text-[13px] text-content-secondary">Recipient</Text>
          <Text className="font-inter-medium text-[14px] text-content-primary">
            {result.recipient}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="font-inter text-[13px] text-content-secondary">Amount</Text>
          <Text className="font-inter-semibold text-[14px] text-content-primary">
            {formatUsdt(result.draft.amount)} USDT
          </Text>
        </View>
        {result.draft.memo ? (
          <View className="flex-row items-center justify-between">
            <Text className="font-inter text-[13px] text-content-secondary">Memo</Text>
            <Text className="font-inter text-[14px] text-content-primary">{result.draft.memo}</Text>
          </View>
        ) : null}
      </View>
      <View className="mt-3 flex-row items-center gap-2 rounded-input border border-brand-primary/20 bg-brand-primary/10 p-3">
        <ShieldCheck size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
        <Text className="flex-1 font-inter text-[12px] leading-[18px] text-content-secondary">
          Copilot never holds your keys. This draft is unsigned — you review, approve, and sign in
          the WDK confirm sheet.
        </Text>
      </View>
      <View className="mt-4">
        <PrimaryButton label="Review and sign with WDK" onPress={onReview} />
      </View>
    </GlassCard>
  );
}

function SplitCard({ result, onOpen }: { result: SplitDraftResult; onOpen: () => void }) {
  return (
    <GlassCard>
      <CardHeader icon={Users} title="Split bill draft" />
      <Text className="mt-2 font-inter text-[14px] leading-[20px] text-content-secondary">
        {result.summary}
      </Text>
      <View className="mt-4 gap-2">
        {result.participants.map((participant) => (
          <View key={participant.key} className="flex-row items-center justify-between">
            <Text className="font-inter-medium text-[14px] text-content-primary">
              {participant.displayName}
            </Text>
            <Text className="font-inter-semibold text-[14px] text-content-primary">
              {formatUsdt(participant.share)} USDT
            </Text>
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row items-center gap-2 rounded-input border border-brand-primary/20 bg-brand-primary/10 p-3">
        <Sparkles size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
        <Text className="flex-1 font-inter text-[12px] leading-[18px] text-content-secondary">
          {result.explanation}
        </Text>
      </View>
      {result.unresolved.length ? (
        <Text className="mt-2 font-inter text-[12px] text-content-secondary">
          Not on ElevenPay yet (added as guests with share codes): {result.unresolved.join(', ')}
        </Text>
      ) : null}
      <View className="mt-4">
        <PrimaryButton label="Open in Split Bill" onPress={onOpen} />
      </View>
    </GlassCard>
  );
}

function PartiesCard({
  result,
  onOpen,
}: {
  result: PartiesResult;
  onOpen: (id: string) => void;
}) {
  return (
    <GlassCard>
      <CardHeader icon={Tv} title="Watch parties" />
      <Text className="mt-2 font-inter text-[14px] leading-[20px] text-content-secondary">
        {result.summary}
      </Text>
      <View className="mt-4 gap-3">
        {result.items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.id)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-input bg-surface-card p-3 active:opacity-80"
          >
            <View className="flex-1">
              <Text className="font-inter-medium text-[14px] text-content-primary">
                {item.title}
              </Text>
              <Text className="font-inter text-[12px] text-content-secondary">
                {item.match} • {item.when}
              </Text>
              <Text className="font-inter text-[12px] text-content-secondary">
                {formatUsdt(item.entryFee)} USDT • {item.seatsLeft} seats left • {item.reason}
              </Text>
            </View>
            <ChevronRight size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
    </GlassCard>
  );
}

function PoolsCard({ result, onOpen }: { result: PoolsResult; onOpen: (id: string) => void }) {
  return (
    <GlassCard>
      <CardHeader icon={Trophy} title="Prediction pools" />
      <Text className="mt-2 font-inter text-[14px] leading-[20px] text-content-secondary">
        {result.summary}
      </Text>
      <View className="mt-4 gap-3">
        {result.items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.id)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-input bg-surface-card p-3 active:opacity-80"
          >
            <View className="flex-1">
              <Text className="font-inter-medium text-[14px] text-content-primary">
                {item.match}
              </Text>
              <Text className="font-inter text-[12px] text-content-secondary">
                Closes in {item.closes} • {item.entries} entries
              </Text>
              <Text className="font-inter text-[12px] text-content-secondary">
                Entry {formatUsdt(item.entryFee)} USDT • Pot {formatUsdt(item.prizePool)} USDT •{' '}
                {item.reason}
              </Text>
            </View>
            <ChevronRight size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
    </GlassCard>
  );
}

const CAPABILITIES: Array<{ icon: LucideIcon; label: string; hint: string }> = [
  { icon: PieChart, label: 'Explain spending', hint: 'Explain my spending this month' },
  { icon: Receipt, label: 'Summarize transactions', hint: 'Summarize my last 10 transactions' },
  { icon: ArrowUpRight, label: 'Prepare transfers', hint: 'Send 5 to @sam for chai' },
  { icon: Users, label: 'Prepare split bills', hint: 'Split 30 with @sam @priya for pizza' },
  { icon: Tv, label: 'Recommend watch parties', hint: 'Recommend watch parties' },
  { icon: Trophy, label: 'Recommend prediction pools', hint: 'Recommend prediction pools' },
];

function CapabilitiesCard({ onPick }: { onPick: (hint: string) => void }) {
  return (
    <GlassCard>
      <CardHeader icon={Bot} title="What I can do" />
      <View className="mt-3 gap-2">
        {CAPABILITIES.map((row) => {
          const Icon = row.icon;
          return (
            <Pressable
              key={row.label}
              onPress={() => onPick(row.hint)}
              accessibilityRole="button"
              className="flex-row items-center gap-3 rounded-input bg-surface-card px-3 py-2.5 active:opacity-80"
            >
              <Icon size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
              <View className="flex-1">
                <Text className="font-inter-medium text-[14px] text-content-primary">
                  {row.label}
                </Text>
                <Text className="font-inter text-[12px] text-content-secondary">
                  “{row.hint}”
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <ShieldCheck size={iconSize.inline} color={colors.text.secondary} strokeWidth={2} />
        <Text className="flex-1 font-inter text-[12px] leading-[18px] text-content-secondary">
          Wallet topics only — and I never touch your private keys. Every payment is a draft you
          sign in the confirm sheet.
        </Text>
      </View>
    </GlassCard>
  );
}

export default function AiScreen() {
  const router = useRouter();
  const setPendingDraft = useUiStore((s) => s.setPendingDraft);
  const setSplitPrefill = useCopilotStore((s) => s.setSplitPrefill);
  const { messages, isThinking, context, send } = useCopilot();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  const insight = useMemo(() => {
    if (!context) return 'Reading your wallet context…';
    const balancePart = context.balance ? `You have ${formatUsdt(context.balance)} USDT. ` : '';
    return `${balancePart}${context.parties.length} watch parties and ${context.pools.length} prediction pools are open for you right now.`;
  }, [context]);

  const suggestions = useMemo(
    () => [
      {
        label: 'Explain my spending this week',
        onPress: () => void send('Explain my spending this week'),
      },
      {
        label: 'Summarize my last 10 transactions',
        onPress: () => void send('Summarize my last 10 transactions'),
      },
      { label: 'Recommend watch parties', onPress: () => void send('Recommend watch parties') },
      {
        label: 'Recommend prediction pools',
        onPress: () => void send('Recommend prediction pools'),
      },
    ],
    [send],
  );

  const submit = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput('');
    void send(text);
  };

  const reviewTransfer = (result: TransferDraftResult) => {
    setPendingDraft(result.draft);
    router.push('/confirm');
  };

  const openSplit = (result: SplitDraftResult) => {
    setSplitPrefill({ total: result.total, memo: result.memo, participants: result.participants });
    router.push('/split');
  };

  const renderResult = (result: ToolResult) => {
    switch (result.kind) {
      case 'spending':
        return <SpendingCard result={result} />;
      case 'transactions':
        return <TransactionsCard result={result} />;
      case 'transfer_draft':
        return <TransferCard result={result} onReview={() => reviewTransfer(result)} />;
      case 'split_draft':
        return <SplitCard result={result} onOpen={() => openSplit(result)} />;
      case 'parties':
        return <PartiesCard result={result} onOpen={(id) => router.push(`/party/${id}`)} />;
      case 'pools':
        return <PoolsCard result={result} onOpen={(id) => router.push(`/pool/${id}`)} />;
      default:
        return null;
    }
  };

  const renderMessage = (message: CopilotMessage) => {
    if (message.role === 'user') {
      return (
        <View
          key={message.id}
          className="max-w-[85%] self-end rounded-input bg-brand-primary/15 px-4 py-3"
        >
          <Text className="font-inter text-[15px] leading-[22px] text-content-primary">
            {message.text}
          </Text>
        </View>
      );
    }
    if (message.role === 'assistant') {
      return (
        <View key={message.id} className="flex-row items-start gap-2 self-start pr-8">
          <Bot size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
          <Text className="flex-1 font-inter text-[15px] leading-[22px] text-content-primary">
            {message.text}
          </Text>
        </View>
      );
    }
    if (message.role === 'error') {
      return (
        <View
          key={message.id}
          className="self-start rounded-input border border-state-error/30 bg-state-error/10 p-3"
        >
          <Text className="font-inter text-[13px] text-state-error">{message.text}</Text>
        </View>
      );
    }
    if (message.role === 'tool_call') {
      return <ToolCallChip key={message.id} call={message.call} />;
    }
    return <View key={message.id}>{renderResult(message.result)}</View>;
  };

  return (
    <ProtectedRoute>
      <Screen>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerClassName="gap-4 py-4"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            <View className="gap-1">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
                AI Copilot
              </Text>
              <Text className="font-inter-bold text-3xl text-content-primary">
                {context?.firstName ? `Hey ${context.firstName}` : 'Your money copilot'}
              </Text>
            </View>

            <InsightCard message={insight} suggestions={suggestions} />

            {messages.length === 0 ? (
              <CapabilitiesCard onPick={(hint) => void send(hint)} />
            ) : null}

            {messages.map(renderMessage)}

            {isThinking ? (
              <View className="flex-row items-center gap-2 self-start">
                <ActivityIndicator color={colors.brand.primary} />
                <Text className="font-inter text-[13px] text-content-secondary">Working…</Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="flex-row items-end gap-3 pb-4 pt-2">
            <View className="flex-1">
              <TextField
                label="Ask Copilot"
                value={input}
                onChangeText={setInput}
                placeholder="Try: send 5 to @sam"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View className="w-24">
              <PrimaryButton label="Send" onPress={submit} disabled={!input.trim() || isThinking} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </ProtectedRoute>
  );
}
