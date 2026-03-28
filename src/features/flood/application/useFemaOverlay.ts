import { useEffect, useRef } from "react";
import type { MapInstanceRef } from "@/features/map/domain/types";

const FEMA_SOURCE_ID = "fema-nfhl";
const FEMA_LAYER_ID = "fema-flood-zones";

// FEMA ArcGIS REST MapServer export — returns pre-rendered flood zone images.
// Layer 28 = Flood Hazard Zones. Transparent PNG, EPSG:4326.
const FEMA_TILE_URL =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export?" +
  "bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857" +
  "&size=512,512&format=png32&transparent=true" +
  "&layers=show:28" +
  "&f=image";

export function useFemaOverlay(
  mapRef: MapInstanceRef,
  visible: boolean,
) {
  const addedRef = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function addFemaLayer() {
      if (!map || addedRef.current) return;
      if (map.getSource(FEMA_SOURCE_ID)) return;

      map.addSource(FEMA_SOURCE_ID, {
        type: "raster",
        tiles: [FEMA_TILE_URL],
        tileSize: 512,
      });

      map.addLayer({
        id: FEMA_LAYER_ID,
        type: "raster",
        source: FEMA_SOURCE_ID,
        paint: {
          "raster-opacity": 0.55,
        },
      });

      addedRef.current = true;
    }

    function removeFemaLayer() {
      if (!map || !addedRef.current) return;

      if (map.getLayer(FEMA_LAYER_ID)) {
        map.removeLayer(FEMA_LAYER_ID);
      }
      if (map.getSource(FEMA_SOURCE_ID)) {
        map.removeSource(FEMA_SOURCE_ID);
      }

      addedRef.current = false;
    }

    if (visible) {
      if (map.isStyleLoaded()) {
        addFemaLayer();
      } else {
        map.once("load", addFemaLayer);
      }
    } else {
      removeFemaLayer();
    }

    // Re-add after style changes (theme switch removes all custom sources)
    function handleStyleData() {
      if (visible && !addedRef.current) {
        // Small delay to let style finish applying
        setTimeout(() => {
          if (map && visible && !addedRef.current) {
            addFemaLayer();
          }
        }, 100);
      }
    }

    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);
    };
  }, [mapRef, visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map && addedRef.current) {
        if (map.getLayer(FEMA_LAYER_ID)) map.removeLayer(FEMA_LAYER_ID);
        if (map.getSource(FEMA_SOURCE_ID)) map.removeSource(FEMA_SOURCE_ID);
        addedRef.current = false;
      }
    };
  }, [mapRef]);
}
