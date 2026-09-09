import { View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useAppTheme } from "@/hooks/use-theme";

export interface DonutSlice {
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const startPt = polar(cx, cy, r, end);
  const endPt = polar(cx, cy, r, start);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
}

export function DonutChart({ slices, size = 180, strokeWidth = 26, centerLabel, centerSubLabel }: Props) {
  const { colors } = useAppTheme();
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        </Svg>
      </View>
    );
  }

  let acc = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      return { ...s, start, end, pct: s.value / total };
    });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation={0} origin={`${cx}, ${cy}`}>
          <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={strokeWidth} fill="none" opacity={0.5} />
          {arcs.map((a, i) => (
            <Path
              key={i}
              d={arcPath(cx, cy, r, a.start, a.end)}
              stroke={a.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>
      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
        {centerLabel ? (
          <View style={{ alignItems: "center" }}>
            <TextCenter size={size * 0.06} color={colors.foreground} bold>
              {centerLabel}
            </TextCenter>
            {centerSubLabel ? <TextCenter size={size * 0.036} color={colors.mutedForeground}>{centerSubLabel}</TextCenter> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

import { Text as RNText } from "react-native";

function TextCenter({ children, size, color, bold }: { children: React.ReactNode; size: number; color: string; bold?: boolean }) {
  return <RNText style={{ fontSize: size, fontWeight: bold ? "700" : "400", color, textAlign: "center" }}>{children}</RNText>;
}