import type { DischargeForecast, FloodLayer, FemaFloodZone } from "./types";

export interface ISurgeInkApiPort {
  fetchForecast(lat: number, lng: number, forecastDays?: number): Promise<DischargeForecast>;
  fetchLayers(bbox: string): Promise<FloodLayer[]>;
}

export interface IFemaPort {
  fetchFloodZone(lat: number, lng: number): Promise<FemaFloodZone | null>;
}
