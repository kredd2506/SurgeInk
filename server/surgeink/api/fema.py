import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

FEMA_QUERY_URL = (
    "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"
)
MAX_RECORDS = 100


@router.get("/fema/zones")
async def get_fema_zones(
    bbox: str = Query(..., description="west,south,east,north"),
):
    parts = bbox.split(",")
    if len(parts) != 4:
        raise HTTPException(422, detail="bbox must have 4 comma-separated values")

    all_features = []
    offset = 0
    has_more = True

    async with httpx.AsyncClient(timeout=30.0) as client:
        while has_more:
            params = {
                "geometry": bbox,
                "geometryType": "esriGeometryEnvelope",
                "inSR": "4326",
                "outSR": "4326",
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "FLD_ZONE,ZONE_SUBTY",
                "returnGeometry": "true",
                "resultOffset": str(offset),
                "resultRecordCount": str(MAX_RECORDS),
                "f": "json",
            }

            resp = await client.get(FEMA_QUERY_URL, params=params)
            if resp.status_code != 200:
                raise HTTPException(502, detail=f"FEMA returned {resp.status_code}")

            data = resp.json()

            if "error" in data:
                raise HTTPException(502, detail=f"FEMA error: {data['error']}")

            features = data.get("features", [])

            for f in features:
                geom = f.get("geometry", {})
                rings = geom.get("rings")
                if not rings:
                    continue
                all_features.append({
                    "type": "Feature",
                    "properties": f.get("attributes", {}),
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": rings,
                    },
                })

            if len(features) < MAX_RECORDS:
                has_more = False
            else:
                offset += MAX_RECORDS

    return {
        "type": "FeatureCollection",
        "features": all_features,
    }
