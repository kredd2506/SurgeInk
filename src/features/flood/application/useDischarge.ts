import { useEffect, useRef, useState } from "react";
import { fetchForecast } from "@/core/services";
import type { DischargeForecast } from "../domain/types";
import { DISCHARGE_DEBOUNCE_MS } from "../infrastructure/constants";

export function useDischarge(lat: number, lng: number) {
  const [forecast, setForecast] = useState<DischargeForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    abortRef.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      abortRef.current = false;
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchForecast(lat, lng, 7);
        if (!abortRef.current) {
          setForecast(data);
        }
      } catch (e) {
        if (!abortRef.current) {
          setError(e instanceof Error ? e.message : "Failed to fetch discharge");
        }
      } finally {
        if (!abortRef.current) {
          setIsLoading(false);
        }
      }
    }, DISCHARGE_DEBOUNCE_MS);

    return () => {
      abortRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lat, lng]);

  return { forecast, isLoading, error };
}
