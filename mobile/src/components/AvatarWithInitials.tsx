import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/hooks/use-theme";
import { initials } from "@/lib/format";
import { Text } from "@/components/ui/Text";

interface Props {
  name?: string | null;
  image?: string | null;
  size?: number;
}

export function AvatarWithInitials({ name, image, size = 48 }: Props) {
  const { colors } = useAppTheme();
  const dims = { width: size, height: size, borderRadius: size / 2 };

  if (image) {
    return <Image source={{ uri: image }} style={[dims, { backgroundColor: colors.accent }]} contentFit="cover" />;
  }
  return (
    <View style={[dims, styles.fallback, { backgroundColor: colors.primary + "1A" }]}>
      <Text variant="bodyStrong" style={{ color: colors.primary, fontSize: size * 0.4 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
});