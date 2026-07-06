import QRCode from 'react-native-qrcode-svg';
import { Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

interface AddressQrProps {
  address: string | null;
  size?: number;
}

/**
 * Wallet address as a scannable QR on a white quiet-zone panel. A public
 * address is safe to display; the light panel keeps it scannable on the dark
 * theme (docs/ui-design.md §6).
 */
export function AddressQr({ address, size = 220 }: AddressQrProps) {
  return (
    <View className="rounded-card bg-white p-5">
      {address ? (
        <QRCode value={address} size={size} color={colors.bg.base} backgroundColor="#FFFFFF" />
      ) : (
        <View className="items-center justify-center" style={{ height: size, width: size }}>
          <Text className="text-center font-inter text-[13px] text-bg-base">
            Create a wallet first
          </Text>
        </View>
      )}
    </View>
  );
}
