import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../components/Logo";
import { COLORS } from "../theme";

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Logo size={104} shadow />
        <Text style={styles.name}>BatiBuild</Text>
        <Text style={styles.tagline}>Votre budget de construction, simplement.</Text>
      </View>
      <View style={styles.footer}>
        <ActivityIndicator color={COLORS.accent} size="small" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: 22,
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.4,
  },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    color: "#9FE3C4",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 21,
  },
  footer: {
    position: "absolute",
    bottom: 56,
    alignItems: "center",
  },
});