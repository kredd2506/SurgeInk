import type { MapInstanceRef } from "@/features/map/domain/types";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useFloodVectorOverlay } from "../application/useFloodVectorOverlay";
import { useFloodContext } from "./FloodContext";
import RiskScoreCard from "./RiskScoreCard";

interface FloodMapOverlayProps {
  mapRef: MapInstanceRef;
  lat: number;
  lng: number;
}

export default function FloodMapOverlay({ mapRef, lat, lng }: FloodMapOverlayProps) {
  const { visibility, setFemaLoading, setFemaFeatureCount } = useFloodContext();
  const { effectiveTheme } = usePosterContext();

  useFloodVectorOverlay(
    mapRef,
    visibility.femaZones,
    effectiveTheme,
    setFemaLoading,
    setFemaFeatureCount,
  );

  return (
    <RiskScoreCard
      lat={lat}
      lng={lng}
      femaEnabled={visibility.femaZones}
      dischargeEnabled={visibility.discharge}
    />
  );
}
