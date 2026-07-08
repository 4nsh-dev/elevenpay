import { useRouter } from 'expo-router';
import {
  ChevronRight,
  FlaskConical,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useLogout } from '@/features/auth';
import { hydrateBackupStatus } from '@/features/recovery';
import { shortenAddress } from '@/lib/format';
import { useDemoStore } from '@/stores/demo';
import { useSessionStore } from '@/stores/session';
import { useWalletStore } from '@/stores/wallet';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const logout = useLogout();
  const userId = useSessionStore((s) => s.userId);
  const fullName = useSessionStore((s) => s.fullName);
  const email = useSessionStore((s) => s.email);
  const address = useWalletStore((s) => s.address);
  const isBackedUp = useWalletStore((s) => s.isBackedUp);
  const isDemoMode = useDemoStore((s) => s.isDemoMode);

  // Backup status lives in device secure storage — mirror it into the store.
  useEffect(() => {
    hydrateBackupStatus(userId).catch(() => undefined);
  }, [userId]);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="flex-grow justify-center gap-6 py-8"
      >
        <View className="gap-2">
          <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
            Profile
          </Text>
          <Text className="font-inter-bold text-3xl text-content-primary">
            {fullName ?? 'ElevenPay account'}
          </Text>
          <Text className="font-inter text-[15px] text-content-secondary">
            {email ?? 'Signed in with Supabase Auth'}
          </Text>
        </View>

        <GlassCard>
          <View className="gap-5">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-primary/10">
                <UserRound size={22} color={colors.brand.primary} strokeWidth={1.75} />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-[15px] text-content-primary">
                  Supabase session
                </Text>
                <Text className="font-inter text-[13px] text-content-secondary">
                  Persistent login enabled
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-slate">
                <Wallet size={22} color={colors.text.secondary} strokeWidth={1.75} />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-[15px] text-content-primary">Wallet</Text>
                <Text className="font-inter text-[13px] text-content-secondary">
                  {address ? shortenAddress(address) : 'Wallet creation comes next'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-slate">
                <ShieldCheck size={22} color={colors.text.secondary} strokeWidth={1.75} />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-[15px] text-content-primary">
                  Custody boundary
                </Text>
                <Text className="font-inter text-[13px] text-content-secondary">
                  Keys never enter auth state
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View className="gap-5">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/recovery')}
              className="flex-row items-center gap-3 active:opacity-80"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-primary/10">
                <KeyRound size={22} color={colors.brand.primary} strokeWidth={1.75} />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-[15px] text-content-primary">
                  Recovery phrase
                </Text>
                <Text
                  className={
                    isBackedUp
                      ? 'font-inter text-[13px] text-content-secondary'
                      : 'font-inter text-[13px] text-state-warning'
                  }
                >
                  {isBackedUp ? 'Backed up — verified on this device' : 'Not backed up yet'}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.text.secondary} strokeWidth={1.75} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/demo')}
              className="flex-row items-center gap-3 active:opacity-80"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-slate">
                <FlaskConical
                  size={22}
                  color={isDemoMode ? colors.brand.primary : colors.text.secondary}
                  strokeWidth={1.75}
                />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-[15px] text-content-primary">
                  Demo mode
                </Text>
                <Text
                  className={
                    isDemoMode
                      ? 'font-inter text-[13px] text-brand-primary'
                      : 'font-inter text-[13px] text-content-secondary'
                  }
                >
                  {isDemoMode ? 'ON — sample data active everywhere' : 'Tour the app with sample data'}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.text.secondary} strokeWidth={1.75} />
            </Pressable>
          </View>
        </GlassCard>

        {logout.error ? (
          <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
            <Text className="font-inter text-[13px] leading-5 text-state-error">
              {logout.error}
            </Text>
          </View>
        ) : null}

        {logout.isLoading ? (
          <PrimaryButton label="Signing out" loading />
        ) : (
          <SecondaryButton
            label="Log out"
            destructive
            onPress={() => {
              logout.run().catch(() => undefined);
            }}
          />
        )}

        <View className="flex-row items-center justify-center gap-2">
          <LogOut size={14} color={colors.text.tertiary} strokeWidth={1.75} />
          <Text className="font-inter text-[12px] text-content-tertiary">
            Local wallet keys are not removed by logout.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
