import { Check, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';

import { statusSteps } from '@/features/wallet';
import { formatUsdt, shortenAddress } from '@/lib/format';
import { colors } from '@/theme/tokens';
import type { ActivityItem } from '@/types/activity';

interface TransactionDetailSheetProps {
  item: ActivityItem | null;
  onClose: () => void;
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="font-inter text-[13px] text-content-secondary">{label}</Text>
      <Text
        className={`font-inter-medium text-[14px] ${accent ? 'text-brand-primary' : 'text-content-primary'}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}

function Timeline({ item }: { item: ActivityItem }) {
  const steps = statusSteps(item);
  return (
    <View className="gap-3">
      {steps.map((step, i) => {
        const dot = step.failed
          ? colors.state.error
          : step.done
            ? colors.brand.primary
            : colors.surface.slate;
        return (
          <View key={step.label} className="flex-row items-center gap-3">
            <View className="items-center">
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: step.done || step.failed ? dot : colors.surface.slate }}
              >
                {step.failed ? (
                  <X size={14} color={colors.text.onPrimary} strokeWidth={2.5} />
                ) : step.done ? (
                  <Check size={14} color={colors.text.onPrimary} strokeWidth={2.5} />
                ) : null}
              </View>
              {i < steps.length - 1 ? <View className="h-4 w-px bg-white/10" /> : null}
            </View>
            <Text
              className={`font-inter-medium text-[14px] ${
                step.failed
                  ? 'text-state-error'
                  : step.done
                    ? 'text-content-primary'
                    : 'text-content-tertiary'
              }`}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Slide-up detail sheet: amount, status timeline, fee, memo, hash (docs/ux-flow.md §7). */
export function TransactionDetailSheet({ item, onClose }: TransactionDetailSheetProps) {
  const visible = item !== null;
  const isIn = item?.direction === 'in';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="rounded-t-sheet bg-surface-card p-6 pb-12" onPress={() => {}}>
          <View className="mb-4 h-1 w-9 self-center rounded-full bg-white/10" />

          {item ? (
            <View className="gap-6">
              <View className="items-center gap-1">
                <Text
                  className="font-inter-bold text-[32px]"
                  style={{
                    color: isIn ? colors.text.positive : colors.text.primary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {isIn ? '+' : '−'}
                  {formatUsdt(item.amount)} USDT
                </Text>
                <Text className="font-inter text-[14px] text-content-secondary">
                  {item.title}
                  {item.subtitle ? ` · ${item.subtitle}` : ''}
                </Text>
              </View>

              <View className="rounded-input bg-surface-slate p-4">
                <Timeline item={item} />
              </View>

              <View className="rounded-input bg-surface-slate px-4 py-2">
                <Row label="Type" value={item.type.replace(/_/g, ' ')} />
                {item.counterparty ? (
                  <Row label="Counterparty" value={shortenAddress(item.counterparty, 6)} />
                ) : null}
                {item.fee ? <Row label="Network fee" value={`${item.fee} ETH`} /> : null}
                {item.timestamp ? (
                  <Row label="Date" value={new Date(item.timestamp).toLocaleString()} />
                ) : null}
                {item.hash ? <Row label="Tx hash" value={shortenAddress(item.hash, 8)} accent /> : null}
              </View>

              {item.memo || item.subtitle ? (
                <View className="rounded-input bg-surface-slate p-4">
                  <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                    Memo
                  </Text>
                  <Text className="mt-2 font-inter text-[14px] leading-5 text-content-secondary">
                    {item.memo ?? item.subtitle}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="h-12 items-center justify-center rounded-button bg-surface-slate active:opacity-80"
              >
                <Text className="font-inter-semibold text-[15px] text-content-primary">Close</Text>
              </Pressable>
            </View>
          ) : (
            <View className="h-10" />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
