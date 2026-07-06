import { Pressable, ScrollView, Text } from 'react-native';

import { HISTORY_FILTERS, type HistoryFilter } from '@/features/wallet';

interface FilterChipsProps {
  active: HistoryFilter;
  onChange: (filter: HistoryFilter) => void;
}

/** Horizontal filter chip row (docs/ui-design.md §4). Active chip = emerald soft tint. */
export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-0.5"
    >
      {HISTORY_FILTERS.map(({ key, label }) => {
        const selected = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`h-9 justify-center rounded-input px-4 active:opacity-80 ${
              selected ? 'bg-brand-primary/15' : 'bg-surface-slate'
            }`}
          >
            <Text
              className={`font-inter-medium text-[13px] ${
                selected ? 'text-brand-primary' : 'text-content-secondary'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
