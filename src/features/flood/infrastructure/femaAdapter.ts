import type { IHttp } from "@/core/http/ports";
import type { IFemaPort } from "../domain/ports";
import type { FemaFloodZone } from "../domain/types";
import { FEMA_QUERY_BASE } from "./constants";

export function createFemaAdapter(http: IHttp): IFemaPort {
  async function fetchFloodZone(
    lat: number,
    lng: number,
  ): Promise<FemaFloodZone | null> {
    const url =
      `${FEMA_QUERY_BASE}?` +
      `geometry=${lng},${lat}` +
      `&geometryType=esriGeometryPoint` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE` +
      `&returnGeometry=false` +
      `&f=json`;

    const response = await http.get(url, {
      headers: { Accept: "application/json" },
    }, 10_000);

    const data = await response.json();
    const features = data.features;

    if (!Array.isArray(features) || features.length === 0) {
      return null;
    }

    const attrs = features[0].attributes;
    const bfe = attrs.STATIC_BFE;

    return {
      floodZone: attrs.FLD_ZONE ?? "Unknown",
      zoneSubtype: attrs.ZONE_SUBTY ?? "",
      isSfha: attrs.SFHA_TF === "T",
      staticBfe: bfe === -9999 ? null : bfe,
    };
  }

  return { fetchFloodZone };
}
