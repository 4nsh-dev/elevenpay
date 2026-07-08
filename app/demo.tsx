import { FlaskConical, PartyPopper, ShieldCheck, Sparkles, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import {
  enterDemoMode,
  exitDemoMode,
  resetDemoMode,
  runDemoPayout,
  type DemoPayoutOutcome,
} from '@/features/demo';
import { refreshWallet } from '@/features/wallet';
import { formatUsdt, shortenAddress } from '@/lib/format';
import { useDemoStore } from '@/stores/demo';
import { useSessionStore } from '@/stores/session';
import { colors } from '@/theme/tokens';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-input bg-surface-slate p-4">
      <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
        {label}
      </Text>
      <Text className="mt-2 font-inter-semibold text-[17px] text-content-primary">{value}</Text>
    </View>
  );
}

export default function DemoScreen() {
  const userId = useSessionStore((s) => s.userId);
  const isDemoMode = useDemoStore((s) => s.isDemoMode);
  const snapshot = useDemoStore((s) => s.snapshot);
  const payoutDone = useDemoStore((s) => s.payoutDone);
  const [payout, setPayout] = useState<DemoPayoutOutcome | null>(null);

  const enter = () => {
    setPayout(null);
    enterDemoMode();
  };

  const reset = () => {
    setPayout(null);
    resetDemoMode();
  };

  const exit = () => {
    setPayout(null);
    exitDemoMode();
    // Restore the real wallet and ledger (demo never modified them).
    refreshWallet(userId).catch(() => undefined);
  };

  return (
    <ProtectedRoute>
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 py-6">
          <View className="gap-2">
            <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
              Sandbox
            </Text>
            <Text className="font-inter-bold text-3xl text-content-primary">Demo mode</Text>
            <Text className="font-inter text-[15px] leading-6 text-content-secondary">
              Tour ElevenPay with a fully seeded sample wallet. Nothing here touches Supabase,
              your keys, or real money.
            </Text>
          </View>

          <GlassCard>
            <View className="flex-row items-center gap-3">
              <View
                className={
                  isDemoMode
                    ? 'h-11 w-11 items-center justify-center rounded-full bg-brand-primary/10'
                    : 'h-11 w-11 items-center justify-center rounded-full bg-surface-slate'
                }
              >
                <FlaskConical
                  size={22}
                  color={isDemoMode ? colors.brand.primary : colors.text.secondary}
                  strokeWidth={1.75}
                />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-[15px] text-content-primary">
                  {isDemoMode ? 'Demo is ON' : 'Demo is OFF'}
                </Text>
                <Text className="font-inter text-[13px] text-content-secondary">
                  {isDemoMode && snapshot
                    ? `Demo wallet ${shortenAddress(snapshot.walletAddress)} is live across the app`
                    : 'Your real wallet and data are untouched'}
                </Text>
              </View>
            </View>
          </GlassCard>

          {isDemoMode && snapshot ? (
            <>
              <View className="flex-row gap-3">
                <Stat label="Demo balance" value={`${formatUsdt(snapshot.balance)} USDT`} />
                <Stat label="Transactions" value={String(snapshot.ledger.length)} />
              </View>
              <View className="flex-row gap-3">
                <Stat label="Watch parties" value={String(snapshot.parties.length)} />
                <Stat label="Open pools" value={String(snapshot.pools.length)} />
              </View>

              <GlassCard>
                <View className="gap-4">
                  <View className="flex-row items-center gap-2">
                    <Trophy size={18} color={colors.brand.primary} strokeWidth={1.75} />
                    <Text className="font-inter-semibold text-[15px] text-content-primary">
                      Payout demo
                    </Text>
                  </View>
                  <Text className="font-inter text-[13px] leading-5 text-content-secondary">
                    Settles the {snapshot.pools[0].match} pool: picks the winner, credits the
                    winnings to the demo balance, and writes a pool payout row into the demo
                    ledger — all in memory.
                  </Text>
                  {payout ? (
                    <View className="rounded-input border border-brand-primary/20 bg-brand-primary/10 p-3">
                      <View className="flex-row items-center gap-2">
                        <PartyPopper size={16} color={colors.brand.primary} strokeWidth={1.75} />
                        <Text className="flex-1 font-inter text-[13px] leading-5 text-content-primary">
                          {payout.winnerTeam} won {payout.match} — {formatUsdt(payout.amount)}{' '}
                          USDT credited to your demo wallet.
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <PrimaryButton
                    label={payoutDone ? 'Payout complete — reset to run again' : 'Run payout demo'}
                    disabled={payoutDone}
                    onPress={() => setPayout(runDemoPayout())}
                  />
                </View>
              </GlassCard>

              <GlassCard>
                <View className="gap-3">
                  <View className="flex-row items-center gap-2">
                    <Sparkles size={18} color={colors.brand.primary} strokeWidth={1.75} />
                    <Text className="font-inter-semibold text-[15px] text-content-primary">
                      Demo the AI copilot
                    </Text>
                  </View>
                  <Text className="font-inter text-[13px] leading-5 text-content-secondary">
                    Open the AI tab and try “explain my spending”, “summarize my last 10
                    transactions”, or “recommend watch parties” — every answer is grounded in
                    this demo snapshot. Transfers and splits stay disabled while demo is on.
                  </Text>
                </View>
              </GlassCard>

              <PrimaryButton label="Reset demo" onPress={reset} />
              <SecondaryButton label="Exit demo mode" onPress={exit} />
            </>
          ) : (
            <>
              <GlassCard>
                <View className="gap-3">
                  <Text className="font-inter-semibold text-[15px] text-content-primary">
                    What you get
                  </Text>
                  <Text className="font-inter text-[13px] leading-5 text-content-secondary">
                    A demo wallet with a 250 USDT balance, a week of sample transactions, two
                    watch parties, two prediction pools, a one-tap pool payout, and an AI
                    copilot grounded in all of it. Reset back to this exact state any time with
                    one tap.
                  </Text>
                </View>
              </GlassCard>
              <PrimaryButton label="Enter demo mode" onPress={enter} />
            </>
          )}

          <View className="flex-row items-center justify-center gap-2">
            <ShieldCheck size={14} color={colors.text.tertiary} strokeWidth={1.75} />
            <Text className="flex-1 text-center font-inter text-[12px] text-content-tertiary">
              No production impact — demo mode never writes to Supabase and never touches your
              wallet keys. It lives in memory and ends on exit or app restart.
            </Text>
          </View>
        </ScrollView>
      </Screen>
    </ProtectedRoute>
  );
}
