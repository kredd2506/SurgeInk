import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useDischarge } from "../application/useDischarge";

interface DischargeSparklineProps {
  lat: number;
  lng: number;
}

export default function DischargeSparkline({ lat, lng }: DischargeSparklineProps) {
  const { forecast, isLoading, error } = useDischarge(lat, lng);

  if (isLoading) {
    return <div className="discharge-sparkline discharge-sparkline--loading">Loading discharge data...</div>;
  }

  if (error) {
    return <div className="discharge-sparkline discharge-sparkline--error">Unable to load discharge</div>;
  }

  if (!forecast || forecast.daily.length === 0) {
    return <div className="discharge-sparkline discharge-sparkline--empty">No discharge data for this location</div>;
  }

  const chartData = forecast.daily
    .filter((d) => d.discharge_m3s != null)
    .map((d) => ({
      date: d.date.slice(5), // MM-DD
      value: d.discharge_m3s,
    }));

  const current = forecast.current_discharge_m3s;

  return (
    <div className="discharge-sparkline">
      <div className="discharge-sparkline__header">
        <span className="discharge-sparkline__label">{forecast.source}</span>
        {current != null ? (
          <span className="discharge-sparkline__value">{current.toFixed(1)} m³/s</span>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="dischargeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a9eff" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#4a9eff" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.85)",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              color: "#fff",
            }}
            formatter={(val: number) => [`${val.toFixed(1)} m³/s`, "Discharge"]}
            labelFormatter={(label: string) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#4a9eff"
            strokeWidth={1.5}
            fill="url(#dischargeGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
