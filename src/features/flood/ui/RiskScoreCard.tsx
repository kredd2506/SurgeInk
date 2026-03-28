import { useFemaZoneInfo } from "../application/useFemaZoneInfo";
import { useDischarge } from "../application/useDischarge";

interface RiskScoreCardProps {
  lat: number;
  lng: number;
  femaEnabled: boolean;
  dischargeEnabled: boolean;
}

const ZONE_RISK: Record<string, { level: string; color: string }> = {
  V: { level: "Extreme", color: "#9b1d20" },
  VE: { level: "Extreme", color: "#9b1d20" },
  A: { level: "High", color: "#d63031" },
  AE: { level: "High", color: "#d63031" },
  AH: { level: "High", color: "#d63031" },
  AO: { level: "High", color: "#d63031" },
  AR: { level: "High", color: "#d63031" },
  "A99": { level: "High", color: "#d63031" },
  B: { level: "Moderate", color: "#e17055" },
  X: { level: "Minimal", color: "#00b894" },
  C: { level: "Minimal", color: "#00b894" },
  D: { level: "Undetermined", color: "#636e72" },
};

function getZoneRisk(zone: string): { level: string; color: string } {
  return ZONE_RISK[zone] ?? { level: "Unknown", color: "#636e72" };
}

export default function RiskScoreCard({
  lat,
  lng,
  femaEnabled,
  dischargeEnabled,
}: RiskScoreCardProps) {
  const { zone, isLoading: femaLoading } = useFemaZoneInfo(lat, lng, femaEnabled);
  const { forecast, isLoading: dischargeLoading } = useDischarge(lat, lng);

  const hasAnyData = (femaEnabled && zone) || (dischargeEnabled && forecast);
  const isLoading = femaLoading || dischargeLoading;

  if (!femaEnabled && !dischargeEnabled) return null;
  if (isLoading && !hasAnyData) return null;

  const risk = zone ? getZoneRisk(zone.floodZone) : null;
  const current = forecast?.current_discharge_m3s;

  return (
    <div className="risk-score-card">
      {femaEnabled && zone ? (
        <div className="risk-score-card__row">
          <span className="risk-score-card__label">FEMA Zone</span>
          <span className="risk-score-card__value">
            <span
              className="risk-score-card__dot"
              style={{ backgroundColor: risk!.color }}
            />
            {zone.floodZone}
            <span className="risk-score-card__sublabel"> — {risk!.level} Risk</span>
          </span>
        </div>
      ) : femaEnabled && !femaLoading ? (
        <div className="risk-score-card__row">
          <span className="risk-score-card__label">FEMA Zone</span>
          <span className="risk-score-card__value risk-score-card__value--muted">
            No data (non-US or unmapped)
          </span>
        </div>
      ) : null}

      {dischargeEnabled && current != null ? (
        <div className="risk-score-card__row">
          <span className="risk-score-card__label">Discharge</span>
          <span className="risk-score-card__value">
            {current.toFixed(1)} m³/s
          </span>
        </div>
      ) : null}

      {zone?.zoneSubtype ? (
        <div className="risk-score-card__subtitle">{zone.zoneSubtype}</div>
      ) : null}
    </div>
  );
}
