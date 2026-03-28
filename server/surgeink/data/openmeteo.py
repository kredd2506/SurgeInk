import httpx

from surgeink.cache.redis_cache import cache_get_json, cache_set_json
from surgeink.config import settings

CACHE_TTL = 21600  # 6 hours


async def fetch_flood_forecast(
    lat: float,
    lng: float,
    forecast_days: int = 7,
    past_days: int = 0,
) -> dict:
    cache_key = f"forecast:{lat:.2f}:{lng:.2f}:{forecast_days}:{past_days}"
    cached = await cache_get_json(cache_key)
    if cached is not None:
        return cached

    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": "river_discharge",
        "forecast_days": forecast_days,
        "past_days": past_days,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.openmeteo_base_url}/v1/flood",
            params=params,
        )
        resp.raise_for_status()

    data = resp.json()

    times = data.get("daily", {}).get("time", [])
    discharges = data.get("daily", {}).get("river_discharge", [])

    result = {
        "latitude": data.get("latitude", lat),
        "longitude": data.get("longitude", lng),
        "daily": [
            {"date": t, "discharge_m3s": d}
            for t, d in zip(times, discharges)
        ],
    }

    await cache_set_json(cache_key, result, CACHE_TTL)
    return result
