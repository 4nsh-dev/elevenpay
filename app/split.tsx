import { useRouter } from 'expo-router';
import { CheckCircle2, Receipt, Sparkles, UserPlus, Users, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Avatar,
  GlassCard,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusChip,
  TextField,
} from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import {
  aiCalculateShares,
  beginPaySplitLeg,
  createBill,
  formatMicroUsdt,
  friendlySplitError,
  parseUsdt,
  searchFriends,
  useSplitBoard,
  validateBill,
  type CreateSplitResult,
  type OwedRequestView,
  type SplitHistoryView,
  type SplitParticipant,
} from '@/features/split-bill';
import { formatUsdt } from '@/lib/format';
import { useCopilotStore } from '@/stores/copilot';
import { useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';
import { colors, iconSize } from '@/theme/tokens';

type FriendProfile = Awaited<ReturnType<typeof searchFriends>>[number];

function makeSelf(): SplitParticipant {
  return { key: 'self', kind: 'self', displayName: 'You', share: '', locked: false };
}

function ModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-1 items-center rounded-input px-4 py-2.5 ${active ? 'bg-brand-primary/15' : ''}`}
    >
      <Text
        className={`font-inter-semibold text-[14px] ${active ? 'text-brand-primary' : 'text-content-secondary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
      <Text className="font-inter text-[13px] leading-5 text-state-error">{message}</Text>
    </View>
  );
}

function ParticipantRow({
  participant,
  onShareChange,
  onToggleLock,
  onRemove,
}: {
  participant: SplitParticipant;
  onShareChange: (next: string) => void;
  onToggleLock: () => void;
  onRemove: () => void;
}) {
  const subtitle =
    participant.kind === 'self'
      ? 'Your share settles instantly'
      : participant.kind === 'friend'
        ? `@${participant.username ?? 'friend'}`
        : 'Guest — gets a share code';

  return (
    <View className="gap-3 rounded-input border border-white/10 bg-surface-slate p-4">
      <View className="flex-row items-center gap-3">
        <Avatar name={participant.displayName} size="sm" />
        <View className="flex-1">
          <Text className="font-inter-semibold text-[15px] text-content-primary">
            {participant.displayName}
          </Text>
          <Text className="mt-0.5 font-inter text-[12px] text-content-tertiary">{subtitle}</Text>
        </View>
        {participant.kind === 'self' ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${participant.displayName}`}
            hitSlop={8}
            onPress={onRemove}
          >
            <X size={iconSize.row} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>

      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <TextField
            label="Share (USDT)"
            value={participant.share}
            onChangeText={onShareChange}
            keyboardType="decimal-pad"
            placeholder="0.000000"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            participant.locked ? 'Unlock share for AI assignment' : 'Lock this share'
          }
          onPress={onToggleLock}
          className={`h-12 w-20 items-center justify-center rounded-input border ${
            participant.locked
              ? 'border-brand-primary/40 bg-brand-primary/10'
              : 'border-white/10 bg-surface-card'
          }`}
        >
          <Text
            className={`font-inter-semibold text-[13px] ${
              participant.locked ? 'text-brand-primary' : 'text-content-secondary'
            }`}
          >
            {participant.locked ? 'Locked' : 'Auto'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type SuccessRow = {
  key: string;
  name: string;
  share: string;
  status: 'PAID' | 'PENDING';
  code: string | null;
};

function buildSuccessRows(
  snapshot: SplitParticipant[],
  result: CreateSplitResult,
): SuccessRow[] {
  let guestIndex = 0;
  return snapshot.map((participant) => {
    let code: string | null = null;
    if (participant.kind === 'guest') {
      code = result.share_links[guestIndex]?.external_ref ?? null;
      guestIndex += 1;
    }
    return {
      key: participant.key,
      name: participant.displayName,
      share: participant.share,
      status: participant.kind === 'self' ? 'PAID' : 'PENDING',
      code,
    };
  });
}

/** Create bill -> participants -> AI shares -> requests -> WDK payments -> history. */
export default function SplitModal() {
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const setPendingDraft = useUiStore((s) => s.setPendingDraft);
  const { mySplits, owedRequests, isLoading, error, reload } = useSplitBoard();

  const [mode, setMode] = useState<'create' | 'activity'>('create');
  const [total, setTotal] = useState('');
  const [memo, setMemo] = useState('');
  const [participants, setParticipants] = useState<SplitParticipant[]>([makeSelf()]);
  const [friendQuery, setFriendQuery] = useState('');
  const [friendResults, setFriendResults] = useState<FriendProfile[]>([]);
  const [guestName, setGuestName] = useState('');
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateSplitResult | null>(null);

  const splitPrefill = useCopilotStore((s) => s.splitPrefill);
  const clearSplitPrefill = useCopilotStore((s) => s.clearSplitPrefill);

  // Copilot handoff: consume an AI-prepared split draft once, then clear it.
  useEffect(() => {
    if (!splitPrefill) return;
    setTotal(splitPrefill.total);
    setMemo(splitPrefill.memo);
    setParticipants(
      splitPrefill.participants.length ? splitPrefill.participants : [makeSelf()],
    );
    setMode('create');
    setCreated(null);
    clearSplitPrefill();
  }, [splitPrefill, clearSplitPrefill]);
  const [createdSnapshot, setCreatedSnapshot] = useState<SplitParticipant[]>([]);
  const [payingLegId, setPayingLegId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Debounced friend search; already-added friends and yourself are filtered.
  useEffect(() => {
    const query = friendQuery.trim();
    if (query.length < 2) {
      setFriendResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchFriends(query);
        setFriendResults(
          results.filter(
            (profile) =>
              profile.id !== userId &&
              !participants.some((participant) => participant.userId === profile.id),
          ),
        );
      } catch {
        setFriendResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [friendQuery, participants, userId]);

  // Refresh the board whenever the user opens Activity (e.g. after paying).
  useEffect(() => {
    if (mode === 'activity') void reload();
  }, [mode, reload]);

  const assignedLabel = useMemo(() => {
    const totalMicro = parseUsdt(total);
    if (totalMicro === null) return null;
    let sum = 0n;
    for (const participant of participants) {
      const share = parseUsdt(participant.share);
      if (share !== null) sum += share;
    }
    const diff = totalMicro - sum;
    if (diff === 0n) return 'Shares sum exactly to the total.';
    return diff > 0n
      ? `${formatMicroUsdt(diff)} USDT still unassigned.`
      : `Over-assigned by ${formatMicroUsdt(-diff)} USDT.`;
  }, [total, participants]);

  function updateParticipant(key: string, patch: Partial<SplitParticipant>) {
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.key === key ? { ...participant, ...patch } : participant,
      ),
    );
  }

  function addFriend(profile: FriendProfile) {
    setParticipants((prev) => [
      ...prev,
      {
        key: `friend-${profile.id}`,
        kind: 'friend',
        displayName: profile.full_name ?? (profile.username ? `@${profile.username}` : 'Friend'),
        userId: profile.id,
        username: profile.username,
        share: '',
        locked: false,
      },
    ]);
    setFriendQuery('');
    setFriendResults([]);
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    setParticipants((prev) => [
      ...prev,
      {
        key: `guest-${Date.now()}`,
        kind: 'guest',
        displayName: name,
        share: '',
        locked: false,
      },
    ]);
    setGuestName('');
  }

  function runAiSplit() {
    setFormError(null);
    const suggestion = aiCalculateShares(total, participants);
    if (!suggestion.ok) {
      setAiNote(null);
      setFormError(suggestion.error);
      return;
    }
    setParticipants((prev) =>
      prev.map((participant) =>
        suggestion.shares[participant.key]
          ? { ...participant, share: suggestion.shares[participant.key] }
          : participant,
      ),
    );
    setAiNote(suggestion.explanation);
  }

  async function onCreate() {
    setFormError(null);
    const validation = validateBill(total, participants);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }
    setCreating(true);
    try {
      const result = await createBill({ total, memo, participants });
      setCreated(result);
      setCreatedSnapshot(participants);
      await reload();
    } catch (caught) {
      setFormError(friendlySplitError(caught));
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setCreated(null);
    setCreatedSnapshot([]);
    setTotal('');
    setMemo('');
    setParticipants([makeSelf()]);
    setFriendQuery('');
    setGuestName('');
    setAiNote(null);
    setFormError(null);
  }

  async function onPay(request: OwedRequestView) {
    setPayError(null);
    setPayingLegId(request.leg.id);
    try {
      const draft = await beginPaySplitLeg(request.leg, request.split);
      setPendingDraft(draft);
      router.push('/confirm');
    } catch (caught) {
      setPayError(friendlySplitError(caught));
      await reload();
    } finally {
      setPayingLegId(null);
    }
  }

  const successRows = created ? buildSuccessRows(createdSnapshot, created) : [];

  return (
    <ProtectedRoute>
      <Screen>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-6 py-4"
          >
            <View className="gap-2">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
                Split Bill
              </Text>
              <Text className="font-inter-bold text-3xl text-content-primary">Split a bill</Text>
              <Text className="font-inter text-[15px] leading-6 text-content-secondary">
                Add friends, let AI assign exact shares, and send payment requests. Every share is
                paid with WDK and saved to your history.
              </Text>
            </View>

            <View className="flex-row gap-2 rounded-input bg-surface-slate p-1">
              <ModeTab label="New split" active={mode === 'create'} onPress={() => setMode('create')} />
              <ModeTab
                label="Activity"
                active={mode === 'activity'}
                onPress={() => setMode('activity')}
              />
            </View>

            {mode === 'create' && created ? (
              <GlassCard>
                <View className="gap-5">
                  <View className="items-center gap-3">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10">
                      <CheckCircle2 size={iconSize.feature} color={colors.brand.primary} />
                    </View>
                    <View className="items-center gap-1">
                      <Text className="font-inter-semibold text-xl text-content-primary">
                        Split created
                      </Text>
                      <Text className="text-center font-inter text-[14px] leading-5 text-content-secondary">
                        {created.total_amount} USDT{created.memo ? ` — ${created.memo}` : ''}.
                        Payment requests are saved in Supabase.
                      </Text>
                    </View>
                  </View>

                  <View className="gap-2">
                    {successRows.map((row) => (
                      <View
                        key={row.key}
                        className="flex-row items-center gap-3 rounded-input bg-surface-slate p-3"
                      >
                        <Avatar name={row.name} size="sm" />
                        <View className="flex-1">
                          <Text className="font-inter-semibold text-[14px] text-content-primary">
                            {row.name}
                          </Text>
                          {row.code ? (
                            <Text className="mt-0.5 font-inter text-[12px] text-content-tertiary">
                              Share code: {row.code.slice(0, 10)}
                            </Text>
                          ) : null}
                        </View>
                        <Text className="font-inter-semibold text-[14px] text-content-primary">
                          {formatUsdt(row.share)} USDT
                        </Text>
                        <StatusChip status={row.status} />
                      </View>
                    ))}
                  </View>

                  <Text className="font-inter text-[13px] leading-5 text-content-secondary">
                    Friends see this request in their Split activity and pay with WDK. Your own
                    share is settled instantly.
                  </Text>

                  <PrimaryButton
                    label="View activity"
                    onPress={() => {
                      resetForm();
                      setMode('activity');
                    }}
                  />
                  <SecondaryButton label="Create another split" onPress={resetForm} />
                  <SecondaryButton label="Done" onPress={() => router.back()} />
                </View>
              </GlassCard>
            ) : null}

            {mode === 'create' && !created ? (
              <>
                <GlassCard>
                  <View className="gap-5">
                    <View className="flex-row items-center gap-2">
                      <Receipt size={iconSize.row} color={colors.brand.primary} />
                      <Text className="font-inter-semibold text-[18px] text-content-primary">
                        The bill
                      </Text>
                    </View>
                    <TextField
                      label="Total amount (USDT)"
                      value={total}
                      onChangeText={setTotal}
                      keyboardType="decimal-pad"
                      placeholder="45.000000"
                    />
                    <TextField
                      label="Memo"
                      value={memo}
                      onChangeText={setMemo}
                      placeholder="e.g. Derby night pizza"
                    />
                  </View>
                </GlassCard>

                <GlassCard>
                  <View className="gap-5">
                    <View className="flex-row items-center gap-2">
                      <Users size={iconSize.row} color={colors.brand.primary} />
                      <Text className="font-inter-semibold text-[18px] text-content-primary">
                        Participants
                      </Text>
                    </View>

                    <View className="gap-3">
                      {participants.map((participant) => (
                        <ParticipantRow
                          key={participant.key}
                          participant={participant}
                          onShareChange={(next) =>
                            updateParticipant(participant.key, { share: next, locked: true })
                          }
                          onToggleLock={() =>
                            updateParticipant(participant.key, { locked: !participant.locked })
                          }
                          onRemove={() =>
                            setParticipants((prev) =>
                              prev.filter((entry) => entry.key !== participant.key),
                            )
                          }
                        />
                      ))}
                    </View>

                    <TextField
                      label="Add a friend by username"
                      value={friendQuery}
                      onChangeText={setFriendQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Search @username"
                    />
                    {friendResults.length > 0 ? (
                      <View className="gap-2">
                        {friendResults.map((profile) => (
                          <Pressable
                            key={profile.id}
                            accessibilityRole="button"
                            onPress={() => addFriend(profile)}
                            className="flex-row items-center gap-3 rounded-input border border-white/10 bg-surface-slate p-3 active:bg-surface-card-hover"
                          >
                            <Avatar
                              name={profile.full_name ?? profile.username ?? 'Fan'}
                              size="sm"
                            />
                            <View className="flex-1">
                              <Text className="font-inter-semibold text-[14px] text-content-primary">
                                {profile.full_name ?? 'Fan'}
                              </Text>
                              {profile.username ? (
                                <Text className="font-inter text-[12px] text-content-tertiary">
                                  @{profile.username}
                                </Text>
                              ) : null}
                            </View>
                            <UserPlus size={iconSize.row} color={colors.brand.primary} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    <View className="flex-row items-end gap-3">
                      <View className="flex-1">
                        <TextField
                          label="Add a guest (no account)"
                          value={guestName}
                          onChangeText={setGuestName}
                          placeholder="e.g. Priya"
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add guest"
                        onPress={addGuest}
                        className="h-12 w-12 items-center justify-center rounded-input border border-white/10 bg-surface-slate active:bg-surface-card-hover"
                      >
                        <UserPlus size={iconSize.row} color={colors.brand.primary} />
                      </Pressable>
                    </View>
                  </View>
                </GlassCard>

                <GlassCard>
                  <View className="gap-4">
                    <View className="flex-row items-center gap-2">
                      <Sparkles size={iconSize.row} color={colors.brand.primary} />
                      <Text className="font-inter-semibold text-[18px] text-content-primary">
                        Shares
                      </Text>
                    </View>
                    <Text className="font-inter text-[13px] leading-5 text-content-secondary">
                      Type a share to lock it, or leave shares on Auto and let AI assign the rest
                      so everything sums exactly.
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      onPress={runAiSplit}
                      className="h-12 flex-row items-center justify-center gap-2 rounded-input border border-brand-primary/30 bg-brand-primary/10 active:bg-brand-primary/20"
                    >
                      <Sparkles size={iconSize.row} color={colors.brand.primary} />
                      <Text className="font-inter-semibold text-[15px] text-brand-primary">
                        AI: calculate shares
                      </Text>
                    </Pressable>

                    {aiNote ? (
                      <View className="flex-row gap-3 rounded-input border border-brand-primary/20 bg-brand-primary/10 p-3">
                        <Sparkles size={iconSize.row} color={colors.brand.primary} />
                        <Text className="flex-1 font-inter text-[13px] leading-5 text-content-secondary">
                          {aiNote}
                        </Text>
                      </View>
                    ) : null}

                    {assignedLabel ? (
                      <Text className="font-inter text-[13px] text-content-tertiary">
                        {assignedLabel}
                      </Text>
                    ) : null}

                    {formError ? <ErrorNotice message={formError} /> : null}

                    <PrimaryButton
                      label="Create split and send requests"
                      loading={isCreating}
                      disabled={!total.trim()}
                      onPress={onCreate}
                    />
                    <SecondaryButton label="Cancel" onPress={() => router.back()} />
                  </View>
                </GlassCard>
              </>
            ) : null}

            {mode === 'activity' ? (
              isLoading ? (
                <View className="items-center py-10">
                  <ActivityIndicator color={colors.brand.primary} />
                </View>
              ) : error ? (
                <GlassCard>
                  <View className="gap-4">
                    <Text className="font-inter text-[14px] leading-6 text-content-secondary">
                      {error}
                    </Text>
                    <SecondaryButton label="Try again" onPress={() => void reload()} />
                  </View>
                </GlassCard>
              ) : (
                <>
                  <GlassCard>
                    <View className="gap-4">
                      <View className="flex-row items-center gap-2">
                        <Receipt size={iconSize.row} color={colors.brand.primary} />
                        <Text className="font-inter-semibold text-[18px] text-content-primary">
                          Requests for you
                        </Text>
                      </View>

                      {owedRequests.length === 0 ? (
                        <Text className="font-inter text-[14px] leading-6 text-content-secondary">
                          You are all settled up — no pending requests.
                        </Text>
                      ) : (
                        owedRequests.map((request) => (
                          <View
                            key={request.leg.id}
                            className="gap-3 rounded-input border border-white/10 bg-surface-slate p-4"
                          >
                            <View className="flex-row items-center gap-3">
                              <Avatar name={request.creatorName} size="sm" />
                              <View className="flex-1">
                                <Text className="font-inter-semibold text-[15px] text-content-primary">
                                  {request.creatorName}
                                </Text>
                                <Text className="mt-0.5 font-inter text-[12px] text-content-tertiary">
                                  {request.memo}
                                </Text>
                              </View>
                              <Text className="font-inter-semibold text-[15px] text-content-primary">
                                {formatUsdt(request.leg.share_amount)} USDT
                              </Text>
                            </View>
                            <PrimaryButton
                              label="Review and pay with WDK"
                              loading={payingLegId === request.leg.id}
                              onPress={() => void onPay(request)}
                            />
                          </View>
                        ))
                      )}

                      {payError ? <ErrorNotice message={payError} /> : null}
                    </View>
                  </GlassCard>

                  <GlassCard>
                    <View className="gap-4">
                      <View className="flex-row items-center gap-2">
                        <Users size={iconSize.row} color={colors.brand.primary} />
                        <Text className="font-inter-semibold text-[18px] text-content-primary">
                          Your splits
                        </Text>
                      </View>

                      {mySplits.length === 0 ? (
                        <Text className="font-inter text-[14px] leading-6 text-content-secondary">
                          No splits yet — create your first one.
                        </Text>
                      ) : (
                        mySplits.map((view: SplitHistoryView) => (
                          <View
                            key={view.split.id}
                            className="flex-row items-center gap-3 rounded-input border border-white/10 bg-surface-slate p-4"
                          >
                            <View className="flex-1">
                              <Text className="font-inter-semibold text-[15px] text-content-primary">
                                {view.split.memo ?? 'Split bill'}
                              </Text>
                              <Text className="mt-0.5 font-inter text-[12px] text-content-tertiary">
                                {formatUsdt(view.split.total_amount)} USDT
                                {view.totalLegs > 0
                                  ? ` • ${view.paidLegs} of ${view.totalLegs} paid`
                                  : ''}
                                {' • '}
                                {new Date(view.split.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                            </View>
                            {view.split.status === 'CANCELLED' ? (
                              <Text className="font-inter-medium text-[12px] text-content-tertiary">
                                Cancelled
                              </Text>
                            ) : (
                              <StatusChip
                                status={view.split.status === 'SETTLED' ? 'PAID' : 'OPEN'}
                              />
                            )}
                          </View>
                        ))
                      )}

                      <SecondaryButton label="Refresh" onPress={() => void reload()} />
                    </View>
                  </GlassCard>
                </>
              )
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </ProtectedRoute>
  );
}
