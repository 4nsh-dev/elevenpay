import { useRouter } from 'expo-router';
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import { recordAndBroadcast } from '@/features/payments';
import { refreshTransactionHistory, refreshWallet } from '@/features/wallet';
import { confirmSplitLegPaid } from '@/features/split-bill';
import { confirmWatchPartySeat } from '@/features/watch-party';
import { formatUsdt, shortenAddress } from '@/lib/format';
import { wdkService, type PaymentDraft, type PreparedTransfer } from '@/services/wdk';
import { useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';
import { colors, iconSize } from '@/theme/tokens';

type ConfirmPhase = 'review' | 'preparing' | 'ready' | 'signing' | 'broadcast';

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-input bg-surface-slate p-4">
      <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
        {label}
      </Text>
      <Text className="mt-2 font-inter-semibold text-[16px] text-content-primary">{value}</Text>
    </View>
  );
}

function LoadingNotice({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-input border border-brand-primary/20 bg-brand-primary/10 p-3">
      <ActivityIndicator color={colors.brand.primary} />
      <Text className="flex-1 font-inter text-[13px] leading-5 text-content-secondary">
        {label}
      </Text>
    </View>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <View className="flex-row gap-3 rounded-input border border-state-error/30 bg-state-error/10 p-3">
      <XCircle size={iconSize.row} color={colors.state.error} />
      <Text className="flex-1 font-inter text-[13px] leading-5 text-state-error">{message}</Text>
    </View>
  );
}

export default function ConfirmSheet() {
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const draft = useUiStore((s) => s.pendingDraft);
  const setPendingDraft = useUiStore((s) => s.setPendingDraft);
  const [prepared, setPrepared] = useState<PreparedTransfer | null>(null);
  const [confirmedDraft, setConfirmedDraft] = useState<PaymentDraft | null>(draft);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ConfirmPhase>('review');

  async function prepare() {
    if (!draft) return;
    setError(null);
    setPhase('preparing');

    try {
      const nextPrepared = await wdkService.prepareTransfer(draft, userId);
      setPrepared(nextPrepared);
      setConfirmedDraft(nextPrepared.draft);
      setPhase('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not prepare transfer.');
      setPhase('review');
    }
  }

  async function signAndBroadcast() {
    if (!prepared) return;
    setError(null);
    setPhase('signing');

    try {
      const result = await recordAndBroadcast(prepared, {
        ownerId: userId,
        receiverWalletId: prepared.draft.metadata?.receiverWalletId ?? null,
      });
      await confirmWatchPartySeat(prepared.draft);
      await confirmSplitLegPaid(prepared.draft);
      setHash(result.transactionHash);
      setConfirmedDraft(prepared.draft);
      setPendingDraft(null);
      setPhase('broadcast');
      await refreshTransactionHistory(userId);
      await refreshWallet(userId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signing failed. Funds did not move.');
      setPhase('ready');
    }
  }

  function closeSheet() {
    if (!hash) setPendingDraft(null);
    router.back();
  }

  const visibleDraft = confirmedDraft ?? draft;

  return (
    <ProtectedRoute>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-sheet bg-surface-card p-6 pb-12">
          <View className="mb-4 h-1 w-9 self-center rounded-full bg-white/10" />

          {hash && visibleDraft ? (
            <View className="gap-5">
              <View className="items-center gap-3">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10">
                  <CheckCircle2 size={iconSize.feature} color={colors.brand.primary} />
                </View>
                <View className="items-center gap-1">
                  <Text className="font-inter-semibold text-xl text-content-primary">
                    Broadcast successful
                  </Text>
                  <Text className="text-center font-inter text-[14px] leading-5 text-content-secondary">
                    WDK signed locally and returned a transaction hash.
                  </Text>
                </View>
              </View>

              <View className="rounded-input bg-surface-slate p-4">
                <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                  Transaction hash
                </Text>
                <Text className="mt-2 font-inter-semibold text-[15px] text-brand-primary">
                  {shortenAddress(hash, 10)}
                </Text>
              </View>

              <View className="flex-row gap-3">
                <DetailTile label="Amount" value={`${formatUsdt(visibleDraft.amount)} USDT`} />
                <DetailTile label="Status" value="Broadcast" />
              </View>

              <PrimaryButton label="Done" onPress={closeSheet} />
            </View>
          ) : !visibleDraft ? (
            <View className="gap-4">
              <Text className="font-inter-semibold text-lg text-content-primary">
                No pending payment
              </Text>
              <Text className="font-inter text-[15px] leading-6 text-content-secondary">
                Start a send flow before opening confirmation.
              </Text>
              <SecondaryButton label="Close" onPress={closeSheet} />
            </View>
          ) : (
            <View className="gap-5">
              <View className="gap-2">
                <Text className="font-inter-semibold text-lg text-content-primary">
                  Review transfer
                </Text>
                <Text className="font-inter text-[14px] leading-5 text-content-secondary">
                  Check the recipient and fee before approving WDK signing.
                </Text>
              </View>

              <View className="rounded-input bg-surface-slate p-4">
                <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                  Recipient
                </Text>
                <Text className="mt-2 font-inter-semibold text-[15px] text-content-primary">
                  {shortenAddress(visibleDraft.to, 10)}
                </Text>
              </View>

              <View className="flex-row gap-3">
                <DetailTile label="Amount" value={`${formatUsdt(visibleDraft.amount)} USDT`} />
                <DetailTile
                  label="Fee"
                  value={prepared ? `${prepared.estimatedFee} ETH` : 'Quote'}
                />
              </View>

              {visibleDraft.memo ? (
                <View className="rounded-input bg-surface-slate p-4">
                  <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                    Memo
                  </Text>
                  <Text className="mt-2 font-inter text-[14px] leading-5 text-content-secondary">
                    {visibleDraft.memo}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row gap-3 rounded-input border border-white/10 bg-surface-slate p-4">
                <ShieldCheck size={iconSize.row} color={colors.brand.primary} />
                <Text className="flex-1 font-inter text-[13px] leading-5 text-content-secondary">
                  Private keys stay inside WDK/SecureStore. ElevenPay only receives the transaction
                  hash.
                </Text>
              </View>

              {phase === 'preparing' ? (
                <LoadingNotice label="Preparing transfer and estimating fee through WDK..." />
              ) : null}
              {phase === 'signing' ? (
                <LoadingNotice label="Waiting for WDK signing and network broadcast..." />
              ) : null}
              {error ? <ErrorNotice message={error} /> : null}

              {prepared ? (
                <PrimaryButton
                  label="Confirm and send"
                  loading={phase === 'signing'}
                  onPress={signAndBroadcast}
                />
              ) : (
                <PrimaryButton
                  label="Prepare transfer"
                  loading={phase === 'preparing'}
                  onPress={prepare}
                />
              )}

              <SecondaryButton label="Cancel" onPress={closeSheet} />
            </View>
          )}
        </View>
      </View>
    </ProtectedRoute>
  );
}
