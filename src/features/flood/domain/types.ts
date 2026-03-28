export interface FloodLayer {
  id: string;
  name: string;
  type: "raster" | "vector" | "geojson";
  source: string;
  available: boolean;
  endpoint?: string;
  tileUrl?: string;
  region?: string;
  reason?: string;
}

export interface DischargeDataPoint {
  date: string;
  discharge_m3s: number | null;
}

export interface DischargeStatistics {
  mean: number | null;
  median: number | null;
  p75: number | null;
  p90: number | null;
  period: string;
}

export interface DischargeForecast {
  latitude: number;
  longitude: number;
  source: string;
  current_discharge_m3s: number | null;
  daily: DischargeDataPoint[];
  statistics: DischargeStatistics | null;
}

export interface FemaFloodZone {
  floodZone: string;
  zoneSubtype: string;
  isSfha: boolean;
  staticBfe: number | null;
}
