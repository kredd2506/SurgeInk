import type { MapInstanceRef } from "@/features/map/domain/types";
import { useFemaOverlay } from "../application/useFemaOverlay";
import { useFloodContext } from "./FloodContext";
import RiskScoreCard from "./RiskScoreCard";

interface FloodMapOverlayProps {
  mapRef: MapInstanceRef;
  lat: number;
  lng: number;
}

export default function FloodMapOverlay({ mapRef, lat, lng }: FloodMapOverlayProps) {
  const { visibility } = useFloodContext();

  // Manage FEMA raster tile layer on MapLibre
  useFemaOverlay(mapRef, visibility.femaZones);

  return (
    <RiskScoreCard
      lat={lat}
      lng={lng}
      femaEnabled={visibility.femaZones}
      dischargeEnabled={visibility.discharge}
    />
  );
}
