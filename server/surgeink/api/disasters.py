import httpx
from fastapi import APIRouter, Query

from surgeink.cache.redis_cache import cache_get_json, cache_set_json

router = APIRouter()

EONET_BASE = "https://eonet.gsfc.nasa.gov/api/v3/events/geojson"
CACHE_TTL = 600  # 10 minutes


@router.get("/disasters")
async def get_disasters(
    categories: str = Query(
        "wildfires,severeStorms,volcanoes,floods,earthquakes",
        description="Comma-separated EONET category IDs",
    ),
    limit: int = Query(200, ge=1, le=1000),
    days: int = Query(30, ge=1, le=365),
    status: str = Query("open", description="open or closed"),
):
    cache_key = f"disasters:{categories}:{limit}:{days}:{status}"
    cached = await cache_get_json(cache_key)
    if cached is not None:
        return cached

    params = {
        "status": status,
        "limit": limit,
        "days": days,
    }
    if categories:
        params["category"] = categories

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(EONET_BASE, params=params)
        resp.raise_for_status()

    data = resp.json()
    await cache_set_json(cache_key, data, CACHE_TTL)
    return data
