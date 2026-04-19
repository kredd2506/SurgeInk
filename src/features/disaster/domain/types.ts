export type DisasterCategory =
  | "wildfires"
  | "severeStorms"
  | "volcanoes"
  | "floods"
  | "earthquakes"
  | "landslides"
  | "seaLakeIce"
  | "drought"
  | "dustHaze"
  | "snow"
  | "tempExtremes";

export interface DisasterCategoryMeta {
  id: DisasterCategory;
  label: string;
  color: string;
  icon: string;
}

export const DISASTER_CATEGORIES: DisasterCategoryMeta[] = [
  { id: "wildfires", label: "Wildfires", color: "#e74c3c", icon: "🔥" },
  { id: "severeStorms", label: "Severe Storms", color: "#9b59b6", icon: "🌀" },
  { id: "volcanoes", label: "Volcanoes", color: "#e67e22", icon: "🌋" },
  { id: "floods", label: "Floods", color: "#3498db", icon: "🌊" },
  { id: "earthquakes", label: "Earthquakes", color: "#f39c12", icon: "⚡" },
  { id: "landslides", label: "Landslides", color: "#8d6e63", icon: "⛰️" },
  { id: "seaLakeIce", label: "Sea & Lake Ice", color: "#00bcd4", icon: "🧊" },
  { id: "drought", label: "Drought", color: "#ff9800", icon: "☀️" },
  { id: "dustHaze", label: "Dust & Haze", color: "#b0bec5", icon: "🌫️" },
  { id: "snow", label: "Snow", color: "#eceff1", icon: "❄️" },
  { id: "tempExtremes", label: "Temperature Extremes", color: "#ff5722", icon: "🌡️" },
];

export function getCategoryMeta(id: string): DisasterCategoryMeta | undefined {
  return DISASTER_CATEGORIES.find((c) => c.id === id);
}

export function getCategoryColor(id: string): string {
  return getCategoryMeta(id)?.color ?? "#888";
}
