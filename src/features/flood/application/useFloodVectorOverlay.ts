import { useEffect, useRef } from "react";
import type { MapInstanceRef } from "@/features/map/domain/types";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import type { BBox4 } from "../domain/types";
import { fetchFloodPolygons } from "@/core/services";
import { buildZoneMatchExpressions } from "../domain/floodColors";
import { FEMA_GEOJSON_DEBOUNCE_MS } from "../infrastructure/constants";

const SOURCE_ID = "fema-flood-geojson";
const HALO_LAYER_ID = "fema-flood-halo";     // outer ink bleed (soft, diffuse)
const FILL_LAYER_ID = "fema-flood-fill";     // core wash
const EDGE_LAYER_ID = "fema-flood-edge";     // inner concentration line

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function useFloodVectorOverlay(
  mapRef: MapInstanceRef,
  visible: boolean,
  theme: ResolvedTheme,
  onLoadingChange?: (loading: boolean) => void,
  onFeatureCount?: (count: number) => void,
) {
  const dataRef = useRef<GeoJSON.FeatureCollection>(EMPTY_FC);
  const addedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  function addLayers(map: maplibregl.Map) {
    if (addedRef.current) return;
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: dataRef.current,
    });

    const exprs = buildZoneMatchExpressions(themeRef.current);

    // Insert below the first symbol layer for better z-ordering
    let beforeId: string | undefined;
    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (layer.type === "symbol") {
        beforeId = layer.id;
        break;
      }
    }

    // 1. Outer halo — wide blurred line rendered on polygon outline (ink seep)
    map.addLayer(
      {
        id: HALO_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": exprs.fillColor as any,
          "line-width": 18,
          "line-blur": 14,
          "line-opacity": 0.35,
        },
      },
      beforeId,
    );

    // 2. Core fill — the ink body
    map.addLayer(
      {
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": exprs.fillColor as any,
          "fill-opacity": exprs.fillOpacity as any,
        },
      },
      beforeId,
    );

    // 3. Inner edge — concentrated outline where ink pools
    map.addLayer(
      {
        id: EDGE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": exprs.lineColor,
          "line-width": 1.2,
          "line-blur": 0.5,
          "line-opacity": 0.6,
        },
      },
      beforeId,
    );

    addedRef.current = true;
  }

  function removeLayers(map: maplibregl.Map) {
    if (!addedRef.current) return;
    try {
      if (map.getLayer(EDGE_LAYER_ID)) map.removeLayer(EDGE_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getLayer(HALO_LAYER_ID)) map.removeLayer(HALO_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch { /* style may have been swapped */ }
    addedRef.current = false;
  }

  function getViewportBbox(map: maplibregl.Map): BBox4 {
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }

  function fetchAndUpdate(map: maplibregl.Map) {
    if (timerRef.current) clearTimeout(timerRef.current);

    onLoadingChange?.(true);

    timerRef.current = setTimeout(async () => {
      try {
        const bbox = getViewportBbox(map);
        const fc = await fetchFloodPolygons(bbox);

        dataRef.current = fc;
        onFeatureCount?.(fc.features.length);

        if (!map.getSource(SOURCE_ID)) {
          addLayers(map);
        }
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(fc);
        }
      } catch (err) {
        console.warn("[FloodOverlay] fetch error:", err);
      } finally {
        onLoadingChange?.(false);
      }
    }, FEMA_GEOJSON_DEBOUNCE_MS);
  }

  // Main visibility effect
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!visible) {
      removeLayers(map);
      return;
    }

    function setup() {
      if (!map || !visible) return;
      addLayers(map);
      fetchAndUpdate(map);
    }

    function onMoveEnd() {
      if (!map || !visible) return;
      fetchAndUpdate(map);
    }

    function onStyleData() {
      addedRef.current = false;
      if (visible && map) {
        setTimeout(() => {
          if (map && visible) {
            addLayers(map);
            const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
            if (src) src.setData(dataRef.current);
          }
        }, 100);
      }
    }

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.once("load", setup);
    }

    map.on("moveend", onMoveEnd);
    map.on("styledata", onStyleData);

    return () => {
      map.off("moveend", onMoveEnd);
      map.off("styledata", onStyleData);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mapRef, visible]);

  // Theme change — update paint properties
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !addedRef.current) return;

    try {
      const exprs = buildZoneMatchExpressions(theme);
      if (map.getLayer(HALO_LAYER_ID)) {
        map.setPaintProperty(HALO_LAYER_ID, "line-color", exprs.fillColor as any);
      }
      if (map.getLayer(FILL_LAYER_ID)) {
        map.setPaintProperty(FILL_LAYER_ID, "fill-color", exprs.fillColor as any);
        map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", exprs.fillOpacity as any);
      }
      if (map.getLayer(EDGE_LAYER_ID)) {
        map.setPaintProperty(EDGE_LAYER_ID, "line-color", exprs.lineColor);
      }
    } catch { /* layer may not exist yet */ }
  }, [theme, mapRef]);

  // Cleanup
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map) removeLayers(map);
    };
  }, [mapRef]);
}
