import { LogOut, ShieldCheck, UserRound, Wallet } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useLogout } from '@/features/auth';
import { shortenAddress } from '@/lib/format';
import { useSessionStore } from '@/stores/session';
import { useWalletStore } from '@/stores/wallet';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const logout = useLogout();
  const fullName = useSessionStore((s) => s.fullName);
  const email = useSessionStore((s) => s.email);
  const address = useWalletStore((s) => s.address);

  return (
    <Screen>
      <View className="flex-1 justify-center gap-6 py-8">
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
                <Text className="font-inter-semibold text-[15px] text-content-primary">
                  Wallet
                </Text>
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
      </View>
    </Screen>
  );
}
