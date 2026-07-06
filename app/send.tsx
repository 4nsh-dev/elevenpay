import { zodResolver } from '@hookform/resolvers/zod';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Camera, QrCode, ScanLine, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, SecondaryButton, TextField } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import {
  extractRecipientAddressFromQr,
  sendMoneySchema,
  type SendMoneyFormValues,
} from '@/features/payments';
import { shortenAddress } from '@/lib/format';
import { useUiStore } from '@/stores/ui';
import { useWalletStore } from '@/stores/wallet';
import { colors, iconSize } from '@/theme/tokens';

export default function SendModal() {
  const router = useRouter();
  const setPendingDraft = useUiStore((s) => s.setPendingDraft);
  const walletAddress = useWalletStore((s) => s.address);
  const balance = useWalletStore((s) => s.balance);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanLocked, setScanLocked] = useState(false);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
    watch,
  } = useForm<SendMoneyFormValues>({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: { to: '', amount: '', memo: '' },
  });

  const recipient = watch('to');
  const amount = watch('amount');

  async function openScanner() {
    setScannerError(null);

    if (!permission?.granted) {
      const nextPermission = await requestPermission();

      if (!nextPermission.granted) {
        setScannerError('Camera permission is required to scan a wallet QR.');
        return;
      }
    }

    setScannerOpen(true);
  }

  function closeScanner() {
    setScannerOpen(false);
    setScanLocked(false);
  }

  function handleQrScanned(result: BarcodeScanningResult) {
    if (scanLocked) return;
    setScanLocked(true);

    const address = extractRecipientAddressFromQr(result.data);

    if (!address) {
      setScannerError('That QR does not contain a valid EVM wallet address.');
      setTimeout(() => setScanLocked(false), 1200);
      return;
    }

    setValue('to', address, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setScannerError(null);
    closeScanner();
  }

  const onSubmit = handleSubmit((values) => {
    setPendingDraft({
      to: values.to,
      amount: values.amount,
      type: 'SEND',
      memo: values.memo,
    });
    router.push('/confirm');
  });

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
            contentContainerClassName="flex-grow py-8"
          >
            <View className="gap-6">
              <View className="gap-2">
                <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
                  Send Money
                </Text>
                <Text className="font-inter-bold text-3xl text-content-primary">Send USDT</Text>
                <Text className="font-inter text-[15px] leading-6 text-content-secondary">
                  Enter a recipient or scan their QR. You will review the transfer before WDK signs.
                </Text>
              </View>

              <GlassCard>
                <View className="gap-5">
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="flex-1">
                      <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                        From
                      </Text>
                      <Text className="mt-2 font-inter-semibold text-[15px] text-content-primary">
                        {walletAddress ? shortenAddress(walletAddress, 8) : 'Wallet unavailable'}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                        Balance
                      </Text>
                      <Text className="mt-2 font-inter-semibold text-[15px] text-content-primary">
                        {balance} USDT
                      </Text>
                    </View>
                  </View>

                  <Controller
                    control={control}
                    name="to"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View className="gap-3">
                        <TextField
                          label="Recipient address"
                          value={value}
                          onBlur={onBlur}
                          onChangeText={(next) => {
                            setScannerError(null);
                            onChange(next);
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholder="0x..."
                          error={errors.to?.message}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Scan recipient QR"
                          onPress={openScanner}
                          className="h-12 flex-row items-center justify-center gap-2 rounded-input border border-white/10 bg-surface-slate active:bg-surface-card-hover"
                        >
                          <QrCode size={iconSize.row} color={colors.brand.primary} />
                          <Text className="font-inter-semibold text-[15px] text-content-primary">
                            Scan QR
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  />

                  {scannerOpen ? (
                    <View className="overflow-hidden rounded-card border border-white/10 bg-black">
                      <View className="flex-row items-center justify-between bg-surface-slate px-4 py-3">
                        <View className="flex-row items-center gap-2">
                          <ScanLine size={iconSize.row} color={colors.brand.primary} />
                          <Text className="font-inter-semibold text-[15px] text-content-primary">
                            Scan recipient QR
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Close QR scanner"
                          hitSlop={12}
                          onPress={closeScanner}
                        >
                          <X size={iconSize.row} color={colors.text.secondary} />
                        </Pressable>
                      </View>
                      <View className="h-80">
                        <CameraView
                          active={scannerOpen}
                          facing="back"
                          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                          onBarcodeScanned={scanLocked ? undefined : handleQrScanned}
                          style={{ flex: 1 }}
                        />
                        <View
                          pointerEvents="none"
                          className="absolute inset-0 items-center justify-center"
                        >
                          <View className="h-48 w-48 rounded-card border-2 border-brand-primary/80" />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="rounded-input border border-white/10 bg-surface-slate p-4">
                      <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10">
                          <Camera size={iconSize.row} color={colors.brand.primary} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-inter-semibold text-[14px] text-content-primary">
                            QR scanner ready
                          </Text>
                          <Text className="mt-1 font-inter text-[13px] leading-5 text-content-secondary">
                            Scanned addresses are validated before a draft is created.
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {scannerError ? (
                    <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
                      <Text className="font-inter text-[13px] leading-5 text-state-error">
                        {scannerError}
                      </Text>
                    </View>
                  ) : null}

                  <Controller
                    control={control}
                    name="amount"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <TextField
                        label="Amount"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="5.000000"
                        error={errors.amount?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="memo"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <TextField
                        label="Memo"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="Optional"
                        error={errors.memo?.message}
                      />
                    )}
                  />

                  <View className="rounded-input border border-white/10 bg-surface-slate p-4">
                    <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                      Review
                    </Text>
                    <Text className="mt-2 font-inter text-[14px] leading-5 text-content-secondary">
                      {recipient && amount
                        ? `${amount} USDT to ${shortenAddress(recipient, 8)}`
                        : 'Add a recipient and amount to continue.'}
                    </Text>
                  </View>

                  <PrimaryButton
                    label="Review transfer"
                    loading={isSubmitting}
                    disabled={!walletAddress}
                    onPress={onSubmit}
                  />
                  <SecondaryButton label="Cancel" onPress={() => router.back()} />
                </View>
              </GlassCard>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </ProtectedRoute>
  );
}
