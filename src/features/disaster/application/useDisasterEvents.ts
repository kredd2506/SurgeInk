import { useEffect, useRef, useState } from "react";
import { fetchDisasterEvents } from "@/core/services";
import type { DisasterCategory } from "../domain/types";

export function useDisasterEvents(
  enabled: boolean,
  categories: DisasterCategory[],
) {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!enabled || categories.length === 0) {
      setData(null);
      setEventCount(0);
      return;
    }

    abortRef.current = false;
    setIsLoading(true);

    fetchDisasterEvents(categories, 300)
      .then((fc) => {
        if (abortRef.current) return;
        setData(fc);
        setEventCount(fc.features.length);
      })
      .catch(() => {
        if (!abortRef.current) setData(null);
      })
      .finally(() => {
        if (!abortRef.current) setIsLoading(false);
      });

    return () => {
      abortRef.current = true;
    };
  }, [enabled, categories.join(",")]);

  return { data, isLoading, eventCount };
}
