import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../components/Logo";
import { COLORS } from "../theme";

/** Sous-titres de marque affichés sous le slogan. */
const PILLARS = ["Gestion", "Suivi", "Estimation", "Intelligence"];

type Props = {
  /** Message d'état de l'étape réellement en cours (jamais une fausse progression). */
  status?: string;
};

export default function SplashScreen({ status = "Initialisation…" }: Props) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;

  // Apparition douce du bloc central — court, non bloquant.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) },
      ]}
    >
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <Logo size={104} shadow />
        <Text style={styles.name}>BatiBuild</Text>
        <Text style={styles.tagline}>Pilotez vos projets de construction intelligemment.</Text>

        <View style={styles.pillars}>
          {PILLARS.map((label, index) => (
            <View key={label} style={styles.pillar}>
              <Text style={styles.pillarText}>{label}</Text>
              {index < PILLARS.length - 1 && <Text style={styles.pillarDot}>•</Text>}
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <ActivityIndicator color={COLORS.accent} size="small" />
        <Text style={styles.status}>{status}</Text>
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
    paddingHorizontal: 24,
  },
  name: {
    marginTop: 22,
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.4,
  },
  tagline: {
    marginTop: 10,
    fontSize: 15,
    color: "#9FE3C4",
    textAlign: "center",
    lineHeight: 22,
  },
  pillars: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pillar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillarText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "rgba(255,255,255,0.72)",
  },
  pillarDot: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  footer: {
    position: "absolute",
    bottom: 48,
    alignItems: "center",
  },
  status: {
    marginTop: 12,
    fontSize: 13,
    color: "#9FE3C4",
    letterSpacing: 0.2,
  },
});
