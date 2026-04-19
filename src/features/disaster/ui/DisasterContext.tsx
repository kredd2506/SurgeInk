import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { DisasterCategory } from "../domain/types";

interface DisasterContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  activeCategories: DisasterCategory[];
  toggleCategory: (id: DisasterCategory) => void;
}

const DEFAULT_CATEGORIES: DisasterCategory[] = ["wildfires", "severeStorms", "volcanoes", "floods", "earthquakes"];

const DisasterContext = createContext<DisasterContextValue | null>(null);

export function DisasterProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [activeCategories, setActiveCategories] = useState<DisasterCategory[]>(DEFAULT_CATEGORIES);

  const toggleCategory = useCallback((id: DisasterCategory) => {
    setActiveCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  return (
    <DisasterContext.Provider value={{ enabled, setEnabled, activeCategories, toggleCategory }}>
      {children}
    </DisasterContext.Provider>
  );
}

export function useDisasterContext() {
  const ctx = useContext(DisasterContext);
  if (!ctx) throw new Error("useDisasterContext must be used within DisasterProvider");
  return ctx;
}
