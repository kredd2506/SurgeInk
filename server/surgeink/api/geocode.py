import httpx
from fastapi import APIRouter, HTTPException, Query

from surgeink.cache.redis_cache import cache_get_json, cache_set_json
from surgeink.config import settings
from surgeink.models.schemas import GeocodeResponse, GeocodeResult

router = APIRouter()

CACHE_TTL = 86400  # 24 hours
USER_AGENT = "SurgeInk/0.1 (flood-risk-viz)"


@router.get("/geocode", response_model=GeocodeResponse)
async def geocode(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(5, ge=1, le=10),
):
    cache_key = f"geocode:{q.lower().strip()}:{limit}"
    cached = await cache_get_json(cache_key)
    if cached is not None:
        return GeocodeResponse(**cached)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.nominatim_base_url}/search",
                params={
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "limit": limit,
                    "q": q,
                },
                headers={"User-Agent": USER_AGENT},
            )
            resp.raise_for_status()
    except Exception as e:
        raise HTTPException(502, detail=f"Nominatim API error: {e}")

    raw_results = resp.json()
    results = []

    for item in raw_results:
        # Nominatim bbox: [south, north, west, east] as strings
        # Convert to [min_lng, min_lat, max_lng, max_lat]
        raw_bbox = item.get("boundingbox", [])
        if len(raw_bbox) == 4:
            south, north, west, east = [float(v) for v in raw_bbox]
            bbox = [west, south, east, north]
        else:
            bbox = []

        results.append(GeocodeResult(
            name=item.get("name", item.get("display_name", "").split(",")[0]),
            display_name=item.get("display_name", ""),
            lat=float(item.get("lat", 0)),
            lng=float(item.get("lon", 0)),
            bbox=bbox,
            flood_data_available=True,
            available_layers=[],
        ))

    response_data = {"results": [r.model_dump() for r in results]}
    await cache_set_json(cache_key, response_data, CACHE_TTL)

    return GeocodeResponse(results=results)
