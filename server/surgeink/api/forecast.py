import statistics as stats

from fastapi import APIRouter, HTTPException, Query

from surgeink.data.openmeteo import fetch_flood_forecast
from surgeink.models.schemas import (
    ForecastDaily,
    ForecastResponse,
    ForecastStatistics,
)

router = APIRouter()


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    forecast_days: int = Query(7, ge=1, le=210),
    include_history: int = Query(0, ge=0, le=92),
):
    try:
        data = await fetch_flood_forecast(lat, lng, forecast_days, include_history)
    except Exception as e:
        raise HTTPException(502, detail=f"Open-Meteo API error: {e}")

    daily_raw = data.get("daily", [])
    daily = [ForecastDaily(date=d["date"], discharge_m3s=d["discharge_m3s"]) for d in daily_raw]

    # Current discharge = first value in the list (today or earliest date)
    current = daily[0].discharge_m3s if daily else None

    # Compute statistics from non-null values
    values = [d.discharge_m3s for d in daily if d.discharge_m3s is not None]
    statistics = None
    if len(values) >= 2:
        sorted_vals = sorted(values)
        p75_idx = int(len(sorted_vals) * 0.75)
        p90_idx = int(len(sorted_vals) * 0.90)
        statistics = ForecastStatistics(
            mean=round(stats.mean(values), 2),
            median=round(stats.median(values), 2),
            p75=round(sorted_vals[min(p75_idx, len(sorted_vals) - 1)], 2),
            p90=round(sorted_vals[min(p90_idx, len(sorted_vals) - 1)], 2),
            period=f"{daily[0].date} to {daily[-1].date}" if daily else "",
        )

    return ForecastResponse(
        latitude=data.get("latitude", lat),
        longitude=data.get("longitude", lng),
        source="Open-Meteo GloFAS v4",
        current_discharge_m3s=current,
        daily=daily,
        statistics=statistics,
    )
