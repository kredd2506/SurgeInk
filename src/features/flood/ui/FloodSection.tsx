import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useFloodContext } from "./FloodContext";
import DischargeSparkline from "./DischargeSparkline";

export default function FloodSection() {
  const { state } = usePosterContext();
  const { visibility, toggleLayer, femaLoading, femaFeatureCount } = useFloodContext();

  const lat = state.selectedLocation?.lat ?? parseFloat(state.form.latitude);
  const lng = state.selectedLocation?.lon ?? parseFloat(state.form.longitude);

  return (
    <section className="panel-block">
      <p className="section-summary-label">FLOOD DATA</p>

      <label className="toggle-field">
        <span>River discharge</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            checked={visibility.discharge}
            onChange={() => toggleLayer("discharge")}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      <label className="toggle-field">
        <span>FEMA flood zones (US)</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            checked={visibility.femaZones}
            onChange={() => toggleLayer("femaZones")}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {visibility.femaZones ? (
        <div className="flood-status">
          {femaLoading ? (
            <span className="flood-status__text flood-status__text--loading">
              Loading flood zones...
            </span>
          ) : femaFeatureCount > 0 ? (
            <span className="flood-status__text flood-status__text--loaded">
              {femaFeatureCount} flood zones loaded
            </span>
          ) : (
            <span className="flood-status__text flood-status__text--empty">
              No flood zone data for this area
            </span>
          )}
        </div>
      ) : null}

      {visibility.discharge && Number.isFinite(lat) && Number.isFinite(lng) ? (
        <DischargeSparkline lat={lat} lng={lng} />
      ) : null}
    </section>
  );
}
