import { useDisasterContext } from "./DisasterContext";
import { useDisasterEvents } from "../application/useDisasterEvents";
import { DISASTER_CATEGORIES } from "../domain/types";

export default function DisasterSection() {
  const { enabled, setEnabled, activeCategories, toggleCategory } = useDisasterContext();
  const { isLoading, eventCount } = useDisasterEvents(enabled, activeCategories);

  return (
    <section className="panel-block">
      <p className="section-summary-label">NASA EONET — LIVE EVENTS</p>

      <label className="toggle-field">
        <span>Show disaster events</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => setEnabled(!enabled)}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {enabled ? (
        <>
          <div className="disaster-status">
            {isLoading ? (
              <span className="flood-status__text flood-status__text--loading">
                Loading events...
              </span>
            ) : eventCount > 0 ? (
              <span className="flood-status__text flood-status__text--loaded">
                {eventCount} active events
              </span>
            ) : (
              <span className="flood-status__text flood-status__text--empty">
                No active events
              </span>
            )}
          </div>

          <div className="disaster-categories">
            {DISASTER_CATEGORIES.filter((c) =>
              ["wildfires", "severeStorms", "volcanoes", "floods", "earthquakes", "landslides"].includes(c.id),
            ).map((cat) => (
              <label key={cat.id} className="disaster-category-toggle">
                <input
                  type="checkbox"
                  checked={activeCategories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                />
                <span
                  className="disaster-category-dot"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="disaster-category-label">{cat.label}</span>
              </label>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
