import { useEffect, useRef, useState } from "react";
import { fetchFemaFloodZone } from "@/core/services";
import type { FemaFloodZone } from "../domain/types";

const DEBOUNCE_MS = 800;

export function useFemaZoneInfo(lat: number, lng: number, enabled: boolean) {
  const [zone, setZone] = useState<FemaFloodZone | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!enabled || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setZone(null);
      return;
    }

    abortRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      abortRef.current = false;
      setIsLoading(true);

      try {
        const result = await fetchFemaFloodZone(lat, lng);
        if (!abortRef.current) {
          setZone(result);
        }
      } catch {
        if (!abortRef.current) {
          setZone(null);
        }
      } finally {
        if (!abortRef.current) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      abortRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lat, lng, enabled]);

  return { zone, isLoading };
}
