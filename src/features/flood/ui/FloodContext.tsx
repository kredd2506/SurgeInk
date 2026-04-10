import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface FloodVisibility {
  femaZones: boolean;
  discharge: boolean;
}

interface FloodContextValue {
  visibility: FloodVisibility;
  toggleLayer: (id: keyof FloodVisibility) => void;
  femaLoading: boolean;
  setFemaLoading: (v: boolean) => void;
  femaFeatureCount: number;
  setFemaFeatureCount: (n: number) => void;
}

const FloodContext = createContext<FloodContextValue | null>(null);

export function FloodProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<FloodVisibility>({
    femaZones: false,
    discharge: true,
  });
  const [femaLoading, setFemaLoading] = useState(false);
  const [femaFeatureCount, setFemaFeatureCount] = useState(0);

  const toggleLayer = useCallback((id: keyof FloodVisibility) => {
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <FloodContext.Provider
      value={{ visibility, toggleLayer, femaLoading, setFemaLoading, femaFeatureCount, setFemaFeatureCount }}
    >
      {children}
    </FloodContext.Provider>
  );
}

export function useFloodContext() {
  const ctx = useContext(FloodContext);
  if (!ctx) throw new Error("useFloodContext must be used within FloodProvider");
  return ctx;
}
