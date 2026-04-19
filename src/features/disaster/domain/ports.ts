import type { DisasterCategory } from "./types";

export interface IEonetPort {
  fetchEvents(categories?: DisasterCategory[], limit?: number): Promise<GeoJSON.FeatureCollection>;
}
