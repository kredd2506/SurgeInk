import type { IHttp } from "@/core/http/ports";
import type { BBox4 } from "../domain/types";
import { SURGEINK_API_URL } from "@/core/config";

/**
 * Fetches FEMA flood zone polygons as GeoJSON via the SurgeInk backend proxy.
 * The backend handles the ESRI→GeoJSON conversion and avoids CORS issues.
 */
export function createFemaGeoJsonAdapter(http: IHttp) {
  async function fetchFloodPolygons(bbox: BBox4): Promise<GeoJSON.FeatureCollection> {
    const bboxStr = bbox.join(",");
    const url = `${SURGEINK_API_URL}/api/v1/fema/zones?bbox=${encodeURIComponent(bboxStr)}`;

    const resp = await http.get(
      url,
      { headers: { Accept: "application/json" } },
      30_000,
    );

    return resp.json();
  }

  return { fetchFloodPolygons };
}
