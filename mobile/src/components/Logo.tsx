import React from "react";
import { StyleSheet, View } from "react-native";
import { COLORS } from "../theme";

type Props = {
  size?: number;
  tileColor?: string;
  glyphColor?: string;
  doorColor?: string;
  shadow?: boolean;
};

/** The BatiBuild house mark — a roof triangle over a body with a door, drawn with plain Views. */
export function HouseMark({
  size = 96,
  color = COLORS.brand,
  doorColor = COLORS.brandDeep,
}: {
  size?: number;
  color?: string;
  doorColor?: string;
}) {
  const roofH = size * 0.34;
  const bodyW = size * 0.58;
  const bodyH = size * 0.5;
  const doorW = size * 0.18;
  const doorH = bodyH * 0.6;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "flex-start" }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size / 2,
          borderRightWidth: size / 2,
          borderBottomWidth: roofH,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
        }}
      />
      <View style={{ width: bodyW, height: bodyH, backgroundColor: color, marginTop: -2, alignItems: "center", paddingTop: doorH * 0.12 }}>
        <View style={{ width: doorW, height: doorH, backgroundColor: doorColor, borderTopLeftRadius: doorW / 3, borderTopRightRadius: doorW / 3 }} />
      </View>
    </View>
  );
}

/** Brand logo: the house mark centered in a rounded tile. */
export function Logo({
  size = 96,
  tileColor = COLORS.white,
  glyphColor = COLORS.brand,
  doorColor = COLORS.brandDeep,
  shadow = false,
}: Props) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.26,
          backgroundColor: tileColor,
        },
        shadow && styles.shadow,
      ]}
    >
      <HouseMark size={size * 0.56} color={glyphColor} doorColor={doorColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});