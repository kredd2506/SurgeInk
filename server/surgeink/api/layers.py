from fastapi import APIRouter, HTTPException, Query

from surgeink.models.schemas import (
    LayerInfo,
    LayerLegend,
    LayerLegendStop,
    LayersResponse,
)

router = APIRouter()

# Hardcoded layer catalog — Phase 1.
# Layers are marked available/unavailable based on what's actually implemented.
# This will become dynamic in Phase 3 (check data availability per bbox).

LAYER_CATALOG = [
    LayerInfo(
        id="ml_risk",
        name="ML Flood Risk Prediction",
        type="raster",
        source="SurgeInk ML v1.0",
        available=False,
        reason="Not yet implemented — Phase 4",
        legend=LayerLegend(
            type="gradient",
            stops=[
                LayerLegendStop(value=1, color="#2166ac", label="Low"),
                LayerLegendStop(value=5, color="#f4a582", label="Moderate"),
                LayerLegendStop(value=10, color="#b2182b", label="Critical"),
            ],
        ),
    ),
    LayerInfo(
        id="jrc_water_occurrence",
        name="Historical Water Occurrence",
        type="raster",
        source="JRC Global Surface Water (1984–2021)",
        available=False,
        reason="Not yet implemented — Phase 2",
    ),
    LayerInfo(
        id="live_discharge",
        name="River Discharge (Live)",
        type="geojson",
        source="Open-Meteo / GloFAS v4",
        endpoint="/api/v1/forecast",
        available=True,
    ),
    LayerInfo(
        id="fema_zones",
        name="FEMA Flood Zones",
        type="vector",
        source="FEMA NFHL",
        available=False,
        region="US only",
        reason="Not yet implemented — Phase 3",
    ),
    LayerInfo(
        id="wri_aqueduct",
        name="Climate Flood Risk Scenarios",
        type="raster",
        source="WRI Aqueduct Floods (via GEE)",
        available=False,
        reason="Not yet implemented — Phase 3",
    ),
    LayerInfo(
        id="interpretability",
        name="Model Interpretability Heatmap",
        type="raster",
        source="SurgeInk ML interpretability",
        available=False,
        reason="Not yet implemented — Phase 4",
    ),
]


@router.get("/layers", response_model=LayersResponse)
async def get_layers(
    bbox: str = Query(
        ...,
        description="Bounding box: min_lng,min_lat,max_lng,max_lat",
    ),
    zoom: int = Query(10, ge=0, le=22),
):
    # Parse bbox
    parts = bbox.split(",")
    if len(parts) != 4:
        raise HTTPException(422, detail="bbox must have exactly 4 comma-separated values")

    try:
        [float(p.strip()) for p in parts]
    except ValueError:
        raise HTTPException(422, detail="bbox values must be numeric")

    # For Phase 1, return the full catalog regardless of bbox.
    # Phase 3 will make availability dynamic based on location.
    return LayersResponse(layers=LAYER_CATALOG)
