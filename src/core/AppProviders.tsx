import type { ReactNode } from "react";
import { PosterProvider } from "@/features/poster/ui/PosterContext";
import { FloodProvider } from "@/features/flood/ui/FloodContext";
import { DisasterProvider } from "@/features/disaster/ui/DisasterContext";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Wraps the application in all required context providers.
 * Add new providers here as needed.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <PosterProvider>
      <FloodProvider>
        <DisasterProvider>{children}</DisasterProvider>
      </FloodProvider>
    </PosterProvider>
  );
}
