import { Image, Text, View } from 'react-native';

const SIZES = { sm: 24, md: 32, lg: 44, xl: 64 } as const;

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof SIZES;
}

/** Image avatar, or initials on emerald tint when there's no photo. */
export function Avatar({ name, imageUrl, size = 'md' }: AvatarProps) {
  const px = SIZES[size];
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        accessibilityLabel={name}
        style={{ width: px, height: px, borderRadius: px / 2 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-brand-primary/10"
      style={{ width: px, height: px }}
    >
      <Text
        className="font-inter-semibold text-brand-primary"
        style={{ fontSize: Math.max(10, px * 0.38) }}
      >
        {initials}
      </Text>
    </View>
  );
}
