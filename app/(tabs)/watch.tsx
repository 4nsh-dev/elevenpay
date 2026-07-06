import { useRouter } from 'expo-router';
import { Clock, MapPin, Ticket, Trophy, Users } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, Screen, StatusChip } from '@/components/ui';
import {
  PREDICTION_POOLS,
  countdownLabel,
  participantCount,
  poolEntryTransaction,
  prizePoolAmount,
  type PredictionPool,
} from '@/features/prediction-pool';
import {
  WATCH_PARTIES,
  availableSeats,
  formatPartyTime,
  paidParticipantCount,
  reservationLabel,
  reservedParticipantCount,
  type WatchParty,
} from '@/features/watch-party';
import { formatUsdt } from '@/lib/format';
import { useWalletStore } from '@/stores/wallet';
import { colors, iconSize } from '@/theme/tokens';

function PartyCard({ party, isJoined }: { party: WatchParty; isJoined: boolean }) {
  const router = useRouter();
  const paidCount = paidParticipantCount(party, isJoined);
  const seatCount = availableSeats(party, isJoined);
  const reservedCount = reservedParticipantCount(party);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/party/[id]', params: { id: party.id } })}
      className="active:scale-[0.99]"
    >
      <GlassCard>
        <View className="gap-4">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-1">
              <Text className="font-inter-semibold text-xl text-content-primary">
                {party.match}
              </Text>
              <Text className="font-inter text-[13px] leading-5 text-content-secondary">
                {party.competition} • {formatPartyTime(party.kickoffAt)}
              </Text>
            </View>
            <StatusChip status={isJoined ? 'PAID' : seatCount > 0 ? 'OPEN' : 'FULL'} />
          </View>

          <Text className="font-inter text-[14px] leading-5 text-content-secondary">
            {party.cover}
          </Text>

          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <MapPin size={iconSize.inline} color={colors.text.secondary} />
              <Text className="font-inter text-[13px] text-content-secondary">
                {party.venue}, {party.city}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Users size={iconSize.inline} color={colors.text.secondary} />
              <Text className="font-inter text-[13px] text-content-secondary">
                {paidCount}/{party.capacity} joined
                {reservedCount ? ` • ${reservedCount} reserved` : ''}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-input bg-surface-slate p-4">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                Entry
              </Text>
              <Text className="mt-2 font-inter-semibold text-[17px] text-content-primary">
                {formatUsdt(party.entryFee)} USDT
              </Text>
            </View>
            <View className="flex-1 rounded-input bg-surface-slate p-4">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                Seats
              </Text>
              <Text className="mt-2 font-inter-semibold text-[17px] text-content-primary">
                {seatCount} left
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Ticket size={iconSize.inline} color={colors.brand.primary} />
            <Text className="font-inter-medium text-[13px] text-brand-primary">
              {isJoined ? 'Ticket confirmed' : reservationLabel()}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function PoolCard({ pool, isJoined }: { pool: PredictionPool; isJoined: boolean }) {
  const router = useRouter();
  const players = participantCount(pool, isJoined);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/pool/[id]', params: { id: pool.id } })}
      className="active:scale-[0.99]"
    >
      <GlassCard>
        <View className="gap-4">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-1">
              <Text className="font-inter-semibold text-xl text-content-primary">{pool.match}</Text>
              <Text className="font-inter text-[13px] leading-5 text-content-secondary">
                {pool.competition}
              </Text>
            </View>
            <StatusChip status={isJoined ? 'PAID' : 'OPEN'} />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-input bg-surface-slate p-4">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                Prize Pool
              </Text>
              <Text className="mt-2 font-inter-semibold text-[17px] text-content-primary">
                {formatUsdt(prizePoolAmount(pool, isJoined))} USDT
              </Text>
            </View>
            <View className="flex-1 rounded-input bg-surface-slate p-4">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                Entry
              </Text>
              <Text className="mt-2 font-inter-semibold text-[17px] text-content-primary">
                {formatUsdt(pool.entryFee)} USDT
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Clock size={iconSize.inline} color={colors.brand.primary} />
            <Text className="font-inter-medium text-[13px] text-brand-primary">
              Closes in {countdownLabel(pool.closesAt)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Users size={iconSize.inline} color={colors.text.secondary} />
            <Text className="font-inter text-[13px] text-content-secondary">
              {players} entries • choose {pool.teams[0].shortName} or {pool.teams[1].shortName}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

/** Watch party discovery backed by local dummy data until Supabase party RPCs exist. */
export default function WatchScreen() {
  const transactions = useWalletStore((s) => s.transactions);
  const joinedPartyIds = new Set(
    transactions
      .filter(
        (transaction) =>
          transaction.type === 'WATCH_PARTY' &&
          transaction.referenceId &&
          transaction.status === 'BROADCAST',
      )
      .map((transaction) => transaction.referenceId),
  );
  const joinedPoolIds = new Set(
    PREDICTION_POOLS.filter((pool) => poolEntryTransaction(transactions, pool.id)).map(
      (pool) => pool.id,
    ),
  );
  const featured = WATCH_PARTIES[0];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 py-4">
        <View className="gap-2">
          <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
            Watch Parties
          </Text>
          <Text className="font-inter-bold text-3xl text-content-primary">Browse events</Text>
          <Text className="font-inter text-[15px] leading-6 text-content-secondary">
            Join football watch events with USDT. Every entry fee goes through WDK confirmation.
          </Text>
        </View>

        {featured ? (
          <View className="rounded-card border border-brand-primary/20 bg-brand-primary/10 p-5">
            <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
              Featured
            </Text>
            <Text className="mt-2 font-inter-semibold text-[20px] text-content-primary">
              {featured.title}
            </Text>
            <Text className="mt-2 font-inter text-[14px] leading-5 text-content-secondary">
              {featured.match} • {formatPartyTime(featured.kickoffAt)}
            </Text>
          </View>
        ) : null}

        <View className="gap-4">
          {WATCH_PARTIES.map((party) => (
            <PartyCard key={party.id} party={party} isJoined={joinedPartyIds.has(party.id)} />
          ))}
        </View>

        <View className="gap-3 pt-2">
          <View className="flex-row items-center gap-2">
            <Trophy size={iconSize.row} color={colors.brand.primary} />
            <Text className="font-inter-semibold text-xl text-content-primary">
              Prediction pools
            </Text>
          </View>
          {PREDICTION_POOLS.map((pool) => (
            <PoolCard key={pool.id} pool={pool} isJoined={joinedPoolIds.has(pool.id)} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
