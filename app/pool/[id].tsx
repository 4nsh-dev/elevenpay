import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, SecondaryButton, StatusChip } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import {
  buildPoolEntryDraft,
  buildPoolRewardDraft,
  countdownLabel,
  formatPoolDate,
  getPredictionPool,
  getTeam,
  joinedPick,
  participantCount,
  poolEntryTransaction,
  poolRewardTransaction,
  prizePoolAmount,
  simulateWinner,
  type PoolTeam,
} from '@/features/prediction-pool';
import { refreshTransactionHistory } from '@/features/wallet';
import { formatUsdt, shortenAddress } from '@/lib/format';
import { wdkService } from '@/services/wdk';
import { useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';
import { useWalletStore } from '@/stores/wallet';
import { colors, iconSize } from '@/theme/tokens';

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-input bg-surface-slate p-4">
      <View className="flex-row items-center gap-2">
        <Icon size={iconSize.inline} color={colors.brand.primary} />
        <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
          {label}
        </Text>
      </View>
      <Text className="mt-2 font-inter-semibold text-[17px] text-content-primary">{value}</Text>
    </View>
  );
}

function PickButton({
  team,
  selected,
  locked,
  onPress,
}: {
  team: PoolTeam;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: locked }}
      onPress={locked ? undefined : onPress}
      className={`flex-1 rounded-input border p-4 active:scale-[0.98] ${
        selected ? 'border-brand-primary bg-brand-primary/10' : 'border-white/10 bg-surface-slate'
      }`}
    >
      <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
        Pick
      </Text>
      <Text className="mt-2 font-inter-semibold text-[18px] text-content-primary">{team.name}</Text>
      <Text className="mt-1 font-inter text-[13px] text-content-secondary">{team.shortName}</Text>
    </Pressable>
  );
}

/** Pool detail -> choose winner -> entry payment -> simulate result -> WDK-signed demo payout. */
export default function PoolDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pool = getPredictionPool(id);
  const userId = useSessionStore((s) => s.userId);
  const setPendingDraft = useUiStore((s) => s.setPendingDraft);
  const transactions = useWalletStore((s) => s.transactions);
  const walletAddress = useWalletStore((s) => s.address);
  const [selectedPick, setSelectedPick] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [winner, setWinner] = useState<PoolTeam | null>(null);
  const [isDistributing, setDistributing] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!pool) {
    return (
      <ProtectedRoute>
        <Screen>
          <View className="flex-1 justify-center gap-4">
            <Text className="font-inter-semibold text-2xl text-content-primary">
              Pool not found
            </Text>
            <Text className="font-inter text-[15px] leading-6 text-content-secondary">
              This prediction pool is no longer available.
            </Text>
            <SecondaryButton label="Back to events" onPress={() => router.back()} />
          </View>
        </Screen>
      </ProtectedRoute>
    );
  }

  const currentPool = pool;
  const entry = poolEntryTransaction(transactions, currentPool.id);
  const reward = poolRewardTransaction(transactions, currentPool.id);
  const lockedPick = joinedPick(transactions, currentPool.id);
  const activePick = lockedPick ?? selectedPick;
  const pickedTeam = getTeam(currentPool, activePick);
  const rewardWinner = getTeam(currentPool, reward?.metadata?.winner);
  const visibleWinner = winner ?? rewardWinner;
  const isJoined = Boolean(entry);
  const players = participantCount(currentPool, isJoined);
  const prizePool = prizePoolAmount(currentPool, isJoined);
  const isClosed = countdownLabel(currentPool.closesAt, now) === 'Closed';
  const canJoin = Boolean(walletAddress && pickedTeam && !isJoined && !isClosed);
  const userWon = Boolean(visibleWinner && lockedPick === visibleWinner.id);

  function joinPool() {
    if (!pickedTeam || !canJoin) return;
    setPendingDraft(buildPoolEntryDraft(currentPool, pickedTeam));
    router.push('/confirm');
  }

  async function simulateMatch() {
    if (!isJoined || !lockedPick || reward) return;

    setSimulationError(null);
    const simulatedWinner = simulateWinner(currentPool);
    setWinner(simulatedWinner);

    if (lockedPick !== simulatedWinner.id) return;

    setDistributing(true);
    try {
      await wdkService.recordDemoReward(
        buildPoolRewardDraft(currentPool, simulatedWinner, prizePool),
        userId,
      );
      await refreshTransactionHistory(userId);
    } catch (caught) {
      setSimulationError(
        caught instanceof Error ? caught.message : 'Could not create WDK reward proof.',
      );
    } finally {
      setDistributing(false);
    }
  }

  return (
    <ProtectedRoute>
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 py-4">
          <View className="gap-2">
            <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
              Prediction Pool
            </Text>
            <Text className="font-inter-bold text-3xl text-content-primary">{pool.match}</Text>
            <Text className="font-inter text-[15px] leading-6 text-content-secondary">
              Choose winner, pay entry fee, simulate result. Reward demo uses WDK signed proof.
            </Text>
          </View>

          <GlassCard>
            <View className="gap-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="font-inter-semibold text-[20px] text-content-primary">
                    {pool.competition}
                  </Text>
                  <Text className="mt-1 font-inter text-[13px] text-content-secondary">
                    Closes in {countdownLabel(pool.closesAt, now)}
                  </Text>
                </View>
                <StatusChip status={reward ? 'PAID' : isJoined ? 'PENDING' : 'OPEN'} />
              </View>

              <View className="flex-row gap-3">
                <InfoTile
                  icon={CircleDollarSign}
                  label="Prize Pool"
                  value={`${formatUsdt(prizePool)} USDT`}
                />
                <InfoTile icon={Trophy} label="Entry" value={`${formatUsdt(pool.entryFee)} USDT`} />
              </View>

              <View className="flex-row gap-3">
                <InfoTile icon={Users} label="Entries" value={`${players}`} />
                <InfoTile
                  icon={CalendarClock}
                  label="Kickoff"
                  value={formatPoolDate(pool.kickoffAt)}
                />
              </View>

              <View className="rounded-input bg-surface-slate p-4">
                <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                  Pool Wallet
                </Text>
                <Text className="mt-2 font-inter-semibold text-[15px] text-content-primary">
                  {shortenAddress(pool.poolWallet, 8)}
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard>
            <View className="gap-4">
              <View>
                <Text className="font-inter-semibold text-[18px] text-content-primary">
                  Choose winner
                </Text>
                <Text className="mt-1 font-inter text-[13px] leading-5 text-content-secondary">
                  Pick locks after WDK broadcasts entry payment.
                </Text>
              </View>

              <View className="flex-row gap-3">
                {pool.teams.map((team) => (
                  <PickButton
                    key={team.id}
                    team={team}
                    selected={activePick === team.id}
                    locked={isJoined}
                    onPress={() => setSelectedPick(team.id)}
                  />
                ))}
              </View>

              {isJoined && pickedTeam ? (
                <View className="flex-row items-center gap-3 rounded-input border border-brand-primary/20 bg-brand-primary/10 p-4">
                  <CheckCircle2 size={iconSize.row} color={colors.brand.primary} />
                  <Text className="flex-1 font-inter text-[13px] leading-5 text-content-secondary">
                    Entry broadcast. Pick locked: {pickedTeam.name}.
                  </Text>
                </View>
              ) : null}

              <PrimaryButton
                label={isJoined ? 'Entry confirmed' : 'Join pool'}
                disabled={!canJoin}
                onPress={joinPool}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <View className="gap-4">
              <View>
                <Text className="font-inter-semibold text-[18px] text-content-primary">
                  Simulate match
                </Text>
                <Text className="mt-1 font-inter text-[13px] leading-5 text-content-secondary">
                  Demo result resolves locally. Winner reward creates WDK signed payout proof.
                </Text>
              </View>

              {visibleWinner ? (
                <View className="rounded-input bg-surface-slate p-4">
                  <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                    Result
                  </Text>
                  <Text className="mt-2 font-inter-semibold text-[18px] text-content-primary">
                    {visibleWinner.name} wins
                  </Text>
                  <Text className="mt-2 font-inter text-[13px] leading-5 text-content-secondary">
                    {userWon
                      ? reward
                        ? `Reward proof recorded: ${formatUsdt(reward.amount)} USDT`
                        : 'You won. Creating WDK reward proof...'
                      : 'Your pick did not win this simulation.'}
                  </Text>
                </View>
              ) : null}

              {isDistributing ? (
                <View className="flex-row items-center gap-3 rounded-input border border-brand-primary/20 bg-brand-primary/10 p-3">
                  <ActivityIndicator color={colors.brand.primary} />
                  <Text className="flex-1 font-inter text-[13px] leading-5 text-content-secondary">
                    WDK signing demo reward distribution...
                  </Text>
                </View>
              ) : null}

              {simulationError ? (
                <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
                  <Text className="font-inter text-[13px] leading-5 text-state-error">
                    {simulationError}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row gap-3 rounded-input border border-white/10 bg-surface-slate p-4">
                <ShieldCheck size={iconSize.row} color={colors.brand.primary} />
                <Text className="flex-1 font-inter text-[13px] leading-5 text-content-secondary">
                  Real automatic payouts need escrow/backend treasury. This demo uses WDK signed
                  local payout proof, not hidden custody.
                </Text>
              </View>

              <PrimaryButton
                label={reward ? 'Reward distributed' : 'Simulate match'}
                disabled={!isJoined || Boolean(reward)}
                loading={isDistributing}
                onPress={simulateMatch}
              />
              <SecondaryButton label="Back to pools" onPress={() => router.back()} />
            </View>
          </GlassCard>
        </ScrollView>
      </Screen>
    </ProtectedRoute>
  );
}
