import { useEffect, useRef } from "react";
import type { MapInstanceRef } from "@/features/map/domain/types";
import { getCategoryColor } from "../domain/types";
import {
  BURN_IMAGE_IDS,
  getBurnMarkCanvases,
} from "../infrastructure/burnMarks";

const SOURCE_ID = "eonet-disasters";
const BURN_LAYER_ID = "eonet-burn";      // wildfire burn marks (symbol)
const CHAR_LAYER_ID = "eonet-char";      // non-fire outer dark ring
const FLAME_LAYER_ID = "eonet-flame";    // non-fire hot glow
const CORE_LAYER_ID = "eonet-core";      // non-fire bright center

export function useDisasterOverlay(
  mapRef: MapInstanceRef,
  visible: boolean,
  data: GeoJSON.FeatureCollection | null,
) {
  const addedRef = useRef(false);
  const imagesLoadedRef = useRef(false);

  function ensureBurnImages(map: maplibregl.Map) {
    if (imagesLoadedRef.current) return;
    const canvases = getBurnMarkCanvases(128);
    canvases.forEach((canvas, i) => {
      const id = BURN_IMAGE_IDS[i];
      if (map.hasImage(id)) return;
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        map.addImage(id, imgData, { pixelRatio: 2 });
      } catch (err) {
        console.warn(`[DisasterOverlay] failed to add ${id}`, err);
      }
    });
    imagesLoadedRef.current = true;
  }

  function addLayers(map: maplibregl.Map) {
    if (addedRef.current) return;
    if (map.getSource(SOURCE_ID)) return;

    ensureBurnImages(map);

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: data ?? { type: "FeatureCollection", features: [] },
    });

    const colorExpr = buildColorExpr();

    // ── NON-FIRE events: stacked blurred circles ──
    // Only visible for non-wildfire categories (volcanoes, storms, floods, etc.)

    map.addLayer({
      id: CHAR_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!=", ["get", "category"], "Wildfires"],
      paint: {
        "circle-radius": 22,
        "circle-color": buildCharColorExpr(),
        "circle-opacity": 0.35,
        "circle-blur": 1.2,
      },
    });

    map.addLayer({
      id: FLAME_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!=", ["get", "category"], "Wildfires"],
      paint: {
        "circle-radius": 11,
        "circle-color": colorExpr,
        "circle-opacity": 0.7,
        "circle-blur": 0.6,
      },
    });

    map.addLayer({
      id: CORE_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!=", ["get", "category"], "Wildfires"],
      paint: {
        "circle-radius": 3.5,
        "circle-color": "#fff5cc",
        "circle-opacity": 0.95,
        "circle-stroke-width": 1,
        "circle-stroke-color": colorExpr,
        "circle-stroke-opacity": 0.8,
      },
    });

    // ── WILDFIRES: paper burn marks (symbol layer) ──
    map.addLayer({
      id: BURN_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["==", ["get", "category"], "Wildfires"],
      layout: {
        // Vary burn variant per feature (hash on id length mod 4)
        "icon-image": [
          "match",
          ["%", ["length", ["to-string", ["coalesce", ["get", "id"], "fire"]]], 4],
          0, BURN_IMAGE_IDS[0],
          1, BURN_IMAGE_IDS[1],
          2, BURN_IMAGE_IDS[2],
          3, BURN_IMAGE_IDS[3],
          BURN_IMAGE_IDS[0],
        ] as any,
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2, 0.6,
          4, 0.9,
          6, 1.3,
          8, 1.8,
          12, 2.5,
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-rotation-alignment": "map",
      },
      paint: {
        "icon-opacity": 0.92,
      },
    });

    addedRef.current = true;
  }

  function removeLayers(map: maplibregl.Map) {
    if (!addedRef.current) return;
    try {
      for (const id of [BURN_LAYER_ID, CORE_LAYER_ID, FLAME_LAYER_ID, CHAR_LAYER_ID]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch { /* style may have been swapped */ }
    addedRef.current = false;
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!visible || !data) {
      removeLayers(map);
      return;
    }

    function setup() {
      if (!map || !visible) return;
      addLayers(map);
    }

    function onStyleData() {
      // Theme swaps wipe custom sources AND images — reload both
      addedRef.current = false;
      imagesLoadedRef.current = false;
      if (visible && map && data) {
        setTimeout(() => {
          if (map && visible) addLayers(map);
        }, 100);
      }
    }

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.once("load", setup);
    }

    map.on("styledata", onStyleData);
    return () => {
      map.off("styledata", onStyleData);
    };
  }, [mapRef, visible, data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !addedRef.current || !data) return;

    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
  }, [data, mapRef]);

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map) removeLayers(map);
    };
  }, [mapRef]);
}

function buildColorExpr(): any {
  return [
    "match", ["get", "category"],
    "Wildfires", getCategoryColor("wildfires"),
    "Volcanoes", getCategoryColor("volcanoes"),
    "Severe Storms", getCategoryColor("severeStorms"),
    "Floods", getCategoryColor("floods"),
    "Earthquakes", getCategoryColor("earthquakes"),
    "Landslides", getCategoryColor("landslides"),
    "Sea and Lake Ice", getCategoryColor("seaLakeIce"),
    "Drought", getCategoryColor("drought"),
    "Dust and Haze", getCategoryColor("dustHaze"),
    "Snow", getCategoryColor("snow"),
    "Temperature Extremes", getCategoryColor("tempExtremes"),
    "#888",
  ];
}

function buildCharColorExpr(): any {
  return [
    "match", ["get", "category"],
    "Volcanoes", "#2b1608",
    "Severe Storms", "#1d0a2e",
    "Floods", "#082c4a",
    "Earthquakes", "#3a2208",
    "Landslides", "#2a1a10",
    "#1a1a1a",
  ];
}
