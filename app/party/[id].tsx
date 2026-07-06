import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarClock,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import {
  Avatar,
  GlassCard,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusChip,
} from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import {
  availableSeats,
  buildWatchPartyDraft,
  formatPartyTime,
  getWatchParty,
  isWatchPartyJoined,
  paidParticipantCount,
  reservationLabel,
  reservedParticipantCount,
  type WatchPartyParticipant,
} from '@/features/watch-party';
import { formatUsdt, shortenAddress } from '@/lib/format';
import { useUiStore } from '@/stores/ui';
import { useWalletStore } from '@/stores/wallet';
import { colors, iconSize } from '@/theme/tokens';

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-row gap-3 rounded-input bg-surface-slate p-4">
      <Icon size={iconSize.row} color={colors.brand.primary} />
      <View className="flex-1 gap-1">
        <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
          {label}
        </Text>
        <Text className="font-inter-semibold text-[15px] leading-5 text-content-primary">
          {value}
        </Text>
      </View>
    </View>
  );
}

function ParticipantRow({ participant }: { participant: WatchPartyParticipant }) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Avatar name={participant.name} size="sm" />
      <View className="flex-1">
        <Text className="font-inter-semibold text-[15px] text-content-primary">
          {participant.name}
        </Text>
        <Text className="mt-1 font-inter text-[13px] text-content-secondary">
          {participant.team}
        </Text>
      </View>
      <StatusChip status={participant.status} />
    </View>
  );
}

/** Party detail -> join payment -> ticket confirmation. */
export default function PartyDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const party = getWatchParty(id);
  const setPendingDraft = useUiStore((s) => s.setPendingDraft);
  const transactions = useWalletStore((s) => s.transactions);
  const walletAddress = useWalletStore((s) => s.address);

  if (!party) {
    return (
      <ProtectedRoute>
        <Screen>
          <View className="flex-1 justify-center gap-4">
            <Text className="font-inter-semibold text-2xl text-content-primary">
              Party not found
            </Text>
            <Text className="font-inter text-[15px] leading-6 text-content-secondary">
              This watch party is no longer available.
            </Text>
            <SecondaryButton label="Back to events" onPress={() => router.back()} />
          </View>
        </Screen>
      </ProtectedRoute>
    );
  }

  const isJoined = isWatchPartyJoined(transactions, party.id);
  const paidCount = paidParticipantCount(party, isJoined);
  const reservedCount = reservedParticipantCount(party);
  const seatCount = availableSeats(party, isJoined);
  const canJoin = Boolean(walletAddress) && !isJoined && seatCount > 0;

  function joinParty() {
    if (!party || !canJoin) return;

    setPendingDraft(buildWatchPartyDraft(party));
    router.push('/confirm');
  }

  return (
    <ProtectedRoute>
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 py-4">
          <View className="gap-2">
            <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
              Watch Party
            </Text>
            <Text className="font-inter-bold text-3xl text-content-primary">{party.title}</Text>
            <Text className="font-inter text-[15px] leading-6 text-content-secondary">
              {party.cover}
            </Text>
          </View>

          {isJoined ? (
            <View className="rounded-card border border-brand-primary/25 bg-brand-primary/10 p-5">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-primary/10">
                  <CheckCircle2 size={iconSize.row} color={colors.brand.primary} />
                </View>
                <View className="flex-1">
                  <Text className="font-inter-semibold text-[17px] text-content-primary">
                    Ticket confirmed
                  </Text>
                  <Text className="mt-1 font-inter text-[13px] leading-5 text-content-secondary">
                    Your WDK broadcast is saved locally as the payment proof for this event.
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <GlassCard>
            <View className="gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1 rounded-input bg-surface-slate p-4">
                  <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                    Entry Fee
                  </Text>
                  <Text className="mt-2 font-inter-semibold text-[18px] text-content-primary">
                    {formatUsdt(party.entryFee)} USDT
                  </Text>
                </View>
                <View className="flex-1 rounded-input bg-surface-slate p-4">
                  <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                    Seats
                  </Text>
                  <Text className="mt-2 font-inter-semibold text-[18px] text-content-primary">
                    {seatCount} left
                  </Text>
                </View>
              </View>

              <InfoRow
                icon={CalendarClock}
                label="Kickoff"
                value={formatPartyTime(party.kickoffAt)}
              />
              <InfoRow icon={MapPin} label="Venue" value={`${party.venue}, ${party.city}`} />
              <InfoRow
                icon={Users}
                label="Participants"
                value={`${paidCount}/${party.capacity} joined${
                  reservedCount ? `, ${reservedCount} reserved` : ''
                }`}
              />

              <View className="rounded-input bg-surface-slate p-4">
                <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                  Host Wallet
                </Text>
                <Text className="mt-2 font-inter-semibold text-[15px] text-content-primary">
                  {shortenAddress(party.hostWallet, 8)}
                </Text>
                <Text className="mt-2 font-inter text-[13px] leading-5 text-content-secondary">
                  Entry fee is sent directly to {party.host}. No private keys leave WDK.
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard>
            <View className="gap-4">
              <View>
                <Text className="font-inter-semibold text-[18px] text-content-primary">
                  Included
                </Text>
                <Text className="mt-1 font-inter text-[13px] text-content-secondary">
                  Matchday perks unlocked after payment broadcast.
                </Text>
              </View>
              <View className="gap-2">
                {party.perks.map((perk) => (
                  <View key={perk} className="flex-row items-center gap-3">
                    <View className="h-2 w-2 rounded-full bg-brand-primary" />
                    <Text className="font-inter text-[14px] text-content-secondary">{perk}</Text>
                  </View>
                ))}
              </View>
            </View>
          </GlassCard>

          <GlassCard>
            <View className="gap-2">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="font-inter-semibold text-[18px] text-content-primary">
                  Participants
                </Text>
                <Text className="font-inter-medium text-[13px] text-content-secondary">
                  {paidCount} joined
                </Text>
              </View>

              {isJoined ? (
                <ParticipantRow
                  participant={{
                    id: 'you',
                    name: 'You',
                    team: 'ElevenPay',
                    status: 'PAID',
                  }}
                />
              ) : null}

              {party.participants.map((participant, index) => (
                <View key={participant.id}>
                  {index > 0 || isJoined ? <View className="h-px bg-white/[0.06]" /> : null}
                  <ParticipantRow participant={participant} />
                </View>
              ))}
            </View>
          </GlassCard>

          <View className="gap-3 pb-2">
            <View className="flex-row gap-3 rounded-input border border-white/10 bg-surface-slate p-4">
              <ShieldCheck size={iconSize.row} color={colors.brand.primary} />
              <Text className="flex-1 font-inter text-[13px] leading-5 text-content-secondary">
                Joining creates a {reservationLabel()} payment draft, then the shared confirm sheet
                prepares and signs with WDK.
              </Text>
            </View>
            <PrimaryButton
              label={isJoined ? 'Ticket confirmed' : 'Join event'}
              disabled={!canJoin}
              onPress={joinParty}
            />
            <SecondaryButton label="Back to events" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </Screen>
    </ProtectedRoute>
  );
}
