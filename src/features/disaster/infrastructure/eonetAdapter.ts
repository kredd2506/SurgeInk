import type { IHttp } from "@/core/http/ports";
import type { IEonetPort } from "../domain/ports";
import type { DisasterCategory } from "../domain/types";
import { SURGEINK_API_URL } from "@/core/config";

export function createEonetAdapter(http: IHttp): IEonetPort {
  async function fetchEvents(
    categories?: DisasterCategory[],
    limit = 200,
  ): Promise<GeoJSON.FeatureCollection> {
    const params = new URLSearchParams();
    if (categories?.length) params.set("categories", categories.join(","));
    params.set("limit", String(limit));
    params.set("days", "30");
    params.set("status", "open");

    const url = `${SURGEINK_API_URL}/api/v1/disasters?${params}`;
    const resp = await http.get(url, { headers: { Accept: "application/json" } }, 20_000);
    const fc: GeoJSON.FeatureCollection = await resp.json();

    // Flatten categories array to a simple string for MapLibre match expressions
    for (const f of fc.features) {
      const cats = f.properties?.categories;
      if (Array.isArray(cats) && cats.length > 0) {
        f.properties!.category = cats[0].title ?? cats[0].id ?? "Unknown";
      } else if (typeof cats === "string") {
        f.properties!.category = cats;
      } else {
        f.properties!.category = "Unknown";
      }
    }

    return fc;
  }

  return { fetchEvents };
}
