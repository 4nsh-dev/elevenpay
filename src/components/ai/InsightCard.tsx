import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui';
import { colors, iconSize } from '@/theme/tokens';

export interface Suggestion {
  label: string;
  onPress?: () => void;
}

interface InsightCardProps {
  /** One-line AI insight, e.g. "You spent 12 USDT on football this week." */
  message: string;
  suggestions?: Suggestion[];
}

/**
 * Ambient AI Copilot surface for the dashboard: an insight line plus tappable
 * suggested actions. The AI prepares; the user taps; nothing signs here
 * (docs/prd.md — AI Copilot, docs/ui-design.md §4 AIMessage/InsightChip).
 */
export function InsightCard({ message, suggestions }: InsightCardProps) {
  return (
    <GlassCard>
      <View className="flex-row items-center gap-2">
        <Sparkles size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
        <Text className="font-inter-medium text-[13px] text-brand-primary">AI Copilot</Text>
      </View>

      <Text className="mt-2 font-inter text-[15px] leading-[22px] text-content-primary">{message}</Text>

      {suggestions?.length ? (
        <View className="mt-4 gap-2">
          {suggestions.map((s) => (
            <Pressable
              key={s.label}
              onPress={s.onPress}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-input bg-brand-primary/10 px-4 py-3 active:opacity-80"
            >
              <Text className="font-inter-medium text-[14px] text-content-primary">{s.label}</Text>
              <ChevronRight size={iconSize.inline} color={colors.brand.primary} strokeWidth={2} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}
