import { useEffect, useRef } from "react";
import type { MapInstanceRef } from "@/features/map/domain/types";
import { getCategoryColor } from "../domain/types";

const SOURCE_ID = "eonet-disasters";
const CHAR_LAYER_ID = "eonet-char";    // outer charred ring (dark, heavy blur)
const FLAME_LAYER_ID = "eonet-flame";  // middle hot glow
const CORE_LAYER_ID = "eonet-core";    // bright ignition center

export function useDisasterOverlay(
  mapRef: MapInstanceRef,
  visible: boolean,
  data: GeoJSON.FeatureCollection | null,
) {
  const addedRef = useRef(false);

  function addLayers(map: maplibregl.Map) {
    if (addedRef.current) return;
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: data ?? { type: "FeatureCollection", features: [] },
    });

    const colorExpr = buildColorExpr();
    const wildfireCharExpr = buildCharColorExpr();

    // 1. Charred outer — heavy blur, dark burned color
    map.addLayer({
      id: CHAR_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": 22,
        "circle-color": wildfireCharExpr,
        "circle-opacity": 0.35,
        "circle-blur": 1.2,
      },
    });

    // 2. Hot glow middle — category color, soft blur
    map.addLayer({
      id: FLAME_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": 11,
        "circle-color": colorExpr,
        "circle-opacity": 0.7,
        "circle-blur": 0.6,
      },
    });

    // 3. Bright ignition core — crisp, small
    map.addLayer({
      id: CORE_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": 3.5,
        "circle-color": "#fff5cc",
        "circle-opacity": 0.95,
        "circle-stroke-width": 1,
        "circle-stroke-color": colorExpr,
        "circle-stroke-opacity": 0.8,
      },
    });

    addedRef.current = true;
  }

  function removeLayers(map: maplibregl.Map) {
    if (!addedRef.current) return;
    try {
      if (map.getLayer(CORE_LAYER_ID)) map.removeLayer(CORE_LAYER_ID);
      if (map.getLayer(FLAME_LAYER_ID)) map.removeLayer(FLAME_LAYER_ID);
      if (map.getLayer(CHAR_LAYER_ID)) map.removeLayer(CHAR_LAYER_ID);
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
      addedRef.current = false;
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

// Darker charred tone per category — wildfires get near-black scorch,
// other disasters get a darker variant of their color
function buildCharColorExpr(): any {
  return [
    "match", ["get", "category"],
    "Wildfires", "#1a0d08",
    "Volcanoes", "#2b1608",
    "Severe Storms", "#1d0a2e",
    "Floods", "#082c4a",
    "Earthquakes", "#3a2208",
    "Landslides", "#2a1a10",
    "#1a1a1a",
  ];
}
