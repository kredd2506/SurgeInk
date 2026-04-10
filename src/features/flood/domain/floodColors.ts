import type { ResolvedTheme } from "@/features/theme/domain/types";
import type { FloodFillStyle } from "./types";
import { blendHex, shiftHexColor } from "@/shared/utils/color";

export type RiskTier = "extreme" | "high" | "moderate" | "minimal" | "undetermined";

const ZONE_TO_TIER: Record<string, RiskTier> = {
  V: "extreme",
  VE: "extreme",
  A: "high",
  AE: "high",
  AH: "high",
  AO: "high",
  AR: "high",
  A99: "high",
  B: "moderate",
  X: "minimal",
  C: "minimal",
  D: "undetermined",
};

export function getZoneTier(zone: string): RiskTier {
  return ZONE_TO_TIER[zone] ?? "undetermined";
}

export function getFloodPalette(
  theme: ResolvedTheme,
): Record<RiskTier, FloodFillStyle> {
  const { water, land, roads } = theme.map;
  const text = theme.ui.text;

  return {
    extreme: {
      fill: blendHex(roads.major, water, 0.4),
      fillOpacity: 0.5,
      stroke: shiftHexColor(water, { lShift: 0.15 }),
      strokeOpacity: 0.6,
    },
    high: {
      fill: shiftHexColor(water, { lShift: 0.1, sShift: 0.1 }),
      fillOpacity: 0.4,
      stroke: shiftHexColor(water, { lShift: 0.12 }),
      strokeOpacity: 0.4,
    },
    moderate: {
      fill: blendHex(water, land, 0.5),
      fillOpacity: 0.3,
      stroke: blendHex(water, text, 0.3),
      strokeOpacity: 0.3,
    },
    minimal: {
      fill: blendHex(land, water, 0.2),
      fillOpacity: 0.15,
      stroke: blendHex(land, water, 0.35),
      strokeOpacity: 0.2,
    },
    undetermined: {
      fill: blendHex(theme.map.parks, land, 0.5),
      fillOpacity: 0.2,
      stroke: blendHex(theme.map.parks, text, 0.3),
      strokeOpacity: 0.2,
    },
  };
}

/**
 * Build MapLibre match expressions for fill-color and fill-opacity
 * based on the FLD_ZONE property and the current theme palette.
 */
export function buildZoneMatchExpressions(theme: ResolvedTheme) {
  const palette = getFloodPalette(theme);
  const tiers = Object.entries(ZONE_TO_TIER);

  const colorCases: (string | string[])[] = [];
  const opacityCases: (string | number | string[])[] = [];

  for (const [zone, tier] of tiers) {
    const style = palette[tier];
    colorCases.push(zone, style.fill);
    opacityCases.push(zone, style.fillOpacity);
  }

  return {
    fillColor: ["match", ["get", "FLD_ZONE"], ...colorCases, palette.undetermined.fill],
    fillOpacity: ["match", ["get", "FLD_ZONE"], ...opacityCases, palette.undetermined.fillOpacity],
    lineColor: palette.high.stroke,
    lineOpacity: 0.25,
  };
}
