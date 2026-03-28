import type { IHttp } from "@/core/http/ports";
import type { ISurgeInkApiPort } from "../domain/ports";
import type { DischargeForecast, FloodLayer } from "../domain/types";
import { SURGEINK_API_URL } from "@/core/config";

export function createSurgeInkApiAdapter(http: IHttp): ISurgeInkApiPort {
  async function fetchForecast(
    lat: number,
    lng: number,
    forecastDays = 7,
  ): Promise<DischargeForecast> {
    const url =
      `${SURGEINK_API_URL}/api/v1/forecast?` +
      `lat=${lat}&lng=${lng}&forecast_days=${forecastDays}`;

    const response = await http.get(url, {
      headers: { Accept: "application/json" },
    }, 15_000);

    return response.json();
  }

  async function fetchLayers(bbox: string): Promise<FloodLayer[]> {
    const url = `${SURGEINK_API_URL}/api/v1/layers?bbox=${encodeURIComponent(bbox)}`;

    const response = await http.get(url, {
      headers: { Accept: "application/json" },
    }, 10_000);

    const data = await response.json();
    return data.layers ?? [];
  }

  return { fetchForecast, fetchLayers };
}
