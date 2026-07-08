import { useRouter } from 'expo-router';
import { Check, Eye, Fingerprint, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import { useRecoveryFlow } from '@/features/recovery';
import { useSessionStore } from '@/stores/session';
import { colors } from '@/theme/tokens';

function AckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      className="flex-row items-center gap-3 active:opacity-80"
    >
      <View
        className={
          checked
            ? 'h-6 w-6 items-center justify-center rounded-md bg-brand-primary'
            : 'h-6 w-6 items-center justify-center rounded-md border border-white/20 bg-surface-slate'
        }
      >
        {checked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
      <Text className="flex-1 font-inter text-[14px] leading-[20px] text-content-secondary">
        {label}
      </Text>
    </Pressable>
  );
}

export default function RecoveryScreen() {
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const flow = useRecoveryFlow(userId);
  const [ackPrivate, setAckPrivate] = useState(false);
  const [ackOwnership, setAckOwnership] = useState(false);

  const allAnswered =
    flow.quiz.length > 0 && flow.quiz.every((question) => Boolean(flow.answers[question.index]));

  return (
    <ProtectedRoute>
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 py-6">
          <View className="gap-2">
            <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
              Wallet security
            </Text>
            <Text className="font-inter-bold text-3xl text-content-primary">Recovery phrase</Text>
            <Text className="font-inter text-[15px] leading-6 text-content-secondary">
              Reveal, back up, and verify the 12 words that control your wallet. Everything stays
              on this device — Supabase never sees them.
            </Text>
          </View>

          {flow.stage === 'intro' ? (
            <>
              <GlassCard>
                <View className="gap-4">
                  <View className="flex-row items-center gap-2">
                    <ShieldAlert size={18} color={colors.brand.primary} strokeWidth={1.75} />
                    <Text className="font-inter-semibold text-[15px] text-content-primary">
                      Before you reveal
                    </Text>
                  </View>
                  <Text className="font-inter text-[14px] leading-[20px] text-content-secondary">
                    Anyone with these 12 words can move your money. ElevenPay support will never
                    ask for them. They are stored only in this device's secure storage — there is
                    no copy anywhere else.
                  </Text>
                  <AckRow
                    label="I am in a private place and nobody can see my screen"
                    checked={ackPrivate}
                    onToggle={() => setAckPrivate((value) => !value)}
                  />
                  <AckRow
                    label="I understand ElevenPay cannot recover these words for me"
                    checked={ackOwnership}
                    onToggle={() => setAckOwnership((value) => !value)}
                  />
                </View>
              </GlassCard>

              <View className="flex-row items-center gap-2">
                <Fingerprint size={16} color={colors.text.secondary} strokeWidth={1.75} />
                <Text className="flex-1 font-inter text-[12px] leading-[18px] text-content-secondary">
                  Your device will ask for biometrics or your passcode before anything is shown.
                </Text>
              </View>

              <PrimaryButton
                label={flow.isLoading ? 'Unlocking' : 'Reveal recovery phrase'}
                loading={flow.isLoading}
                disabled={!ackPrivate || !ackOwnership}
                onPress={() => {
                  void flow.reveal();
                }}
              />
            </>
          ) : null}

          {flow.stage === 'revealed' ? (
            <>
              <GlassCard>
                <View className="gap-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Eye size={18} color={colors.brand.primary} strokeWidth={1.75} />
                      <Text className="font-inter-semibold text-[15px] text-content-primary">
                        Your 12 words
                      </Text>
                    </View>
                    <Text className="font-inter text-[12px] text-content-secondary">
                      Hides in {flow.secondsLeft}s
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    {flow.words.map((word, index) => (
                      <View
                        key={`${index}-${word}`}
                        className="w-[31%] flex-row items-baseline gap-1.5 rounded-input border border-white/10 bg-surface-slate px-2.5 py-2"
                      >
                        <Text className="font-inter text-[11px] text-content-tertiary">
                          {index + 1}
                        </Text>
                        <Text className="font-inter-semibold text-[13px] text-content-primary">
                          {word}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text className="font-inter text-[12px] leading-[18px] text-content-secondary">
                    Write them on paper, in order. Do not screenshot them, copy them, or store
                    them in notes or cloud backups.
                  </Text>
                </View>
              </GlassCard>

              <PrimaryButton label="I wrote them down — verify" onPress={flow.startVerify} />
              <SecondaryButton label="Hide now and verify later" onPress={flow.startVerify} />
            </>
          ) : null}

          {flow.stage === 'verify' ? (
            <>
              <GlassCard>
                <View className="gap-5">
                  <Text className="font-inter-semibold text-[15px] text-content-primary">
                    Confirm three words from your backup
                  </Text>
                  {flow.quiz.map((question) => (
                    <View key={question.index} className="gap-2">
                      <Text className="font-inter text-[13px] text-content-secondary">
                        Word #{question.index + 1}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {question.options.map((option) => {
                          const selected = flow.answers[question.index] === option;
                          return (
                            <Pressable
                              key={option}
                              accessibilityRole="button"
                              onPress={() => flow.selectAnswer(question.index, option)}
                              className={
                                selected
                                  ? 'rounded-input border border-brand-primary bg-brand-primary/15 px-3 py-2'
                                  : 'rounded-input border border-white/10 bg-surface-slate px-3 py-2'
                              }
                            >
                              <Text
                                className={
                                  selected
                                    ? 'font-inter-semibold text-[13px] text-brand-primary'
                                    : 'font-inter text-[13px] text-content-primary'
                                }
                              >
                                {option}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </GlassCard>

              <PrimaryButton
                label="Confirm backup"
                disabled={!allAnswered}
                onPress={() => {
                  void flow.submitVerify();
                }}
              />
              <SecondaryButton label="Show the phrase again" onPress={flow.showAgain} />
            </>
          ) : null}

          {flow.stage === 'done' ? (
            <>
              <GlassCard>
                <View className="items-center gap-3 py-2">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10">
                    <ShieldCheck size={26} color={colors.brand.primary} strokeWidth={1.75} />
                  </View>
                  <Text className="font-inter-bold text-xl text-content-primary">
                    Backup verified
                  </Text>
                  <Text className="text-center font-inter text-[14px] leading-[20px] text-content-secondary">
                    Marked as backed up — on this device only. If you ever reinstall the app or
                    switch phones, restore with your 12 words from the create-or-restore screen.
                  </Text>
                </View>
              </GlassCard>

              <PrimaryButton label="Done" onPress={() => router.back()} />
            </>
          ) : null}

          {flow.error ? (
            <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
              <Text className="font-inter text-[13px] leading-5 text-state-error">{flow.error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </Screen>
    </ProtectedRoute>
  );
}
