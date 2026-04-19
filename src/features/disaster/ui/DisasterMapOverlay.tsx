import type { MapInstanceRef } from "@/features/map/domain/types";
import { useDisasterContext } from "./DisasterContext";
import { useDisasterEvents } from "../application/useDisasterEvents";
import { useDisasterOverlay } from "../application/useDisasterOverlay";

interface DisasterMapOverlayProps {
  mapRef: MapInstanceRef;
}

export default function DisasterMapOverlay({ mapRef }: DisasterMapOverlayProps) {
  const { enabled, activeCategories } = useDisasterContext();
  const { data } = useDisasterEvents(enabled, activeCategories);

  useDisasterOverlay(mapRef, enabled, data);

  return null;
}
