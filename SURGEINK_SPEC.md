# SurgeInk — Technical Specification

> **SurgeInk** — A flood risk visualization engine built on [TerraInk](https://github.com/yousifamanuel/terraink). Transform flood prediction data into stunning, print-ready cartographic posters with customizable themes, layers, and typography. Powered by multi-source flood data, machine learning, and OpenStreetMap.

---

## 1. Project Overview

### What is SurgeInk?

SurgeInk extends TerraInk's cartographic poster engine with flood risk visualization layers. Users search for any location globally, and SurgeInk overlays flood risk data — historical flood extent, real-time river discharge forecasts, elevation-based risk, and ML-predicted flood probability — onto beautiful, themed map posters they can export as high-res PNGs.

### Core Value Proposition

- **For urban planners / civil engineers**: Interpretable flood risk maps from multi-source data and ML inference, overlaid on real cartography
- **For researchers**: Multi-source flood data aggregation with model interpretability visualizations (attention maps, feature importance)
- **For general users**: Beautiful flood-aware map posters of any city — "know your risk, frame your city"

### Upstream Dependency

- **TerraInk** (MIT License): React + TypeScript, Bun + Vite, MapLibre GL JS, OpenFreeMap vector tiles, Nominatim geocoding, Google Fonts, PNG export
- SurgeInk extends TerraInk in the same repo (monorepo) and adds a Python backend (FastAPI) for data ingestion, ML inference, and flood data APIs

---

## 2. Data Architecture

### 2.1 Data Source Inventory

All sources are free/open. Organized by priority tier based on accessibility, value, and integration effort.

#### P0 — MVP (must-have, accessible today)

| Source | Coverage | Resolution | Access Model | What It Provides |
|--------|----------|------------|-------------|-----------------|
| **Open-Meteo Flood API** | Global | 5km | Free, no API key, JSON REST | River discharge forecasts (210 days ahead), historical data (1984–present), ensemble stats. Wraps GloFAS v4. Zero-friction starting point |
| **Google Earth Engine (GEE)** | Global | 30–250m | Free Python API (`earthengine-api`, `geemap`). Community tier: 150 EECU-hours/month (quota tiers effective April 27, 2026) | Petabyte-scale catalog: satellite imagery, DEM, land cover, historical flood extent — single API gateway for JRC, WRI Aqueduct, Groundsource, and DEMs |
| **JRC Global Surface Water** (via GEE) | Global | 30m | Free via GEE (`JRC/GSW1_4/GlobalSurfaceWater`) | 37-year water occurrence, seasonality, recurrence, transitions (1984–2021 from Landsat). Effectively a historical flood probability map |
| **WRI Aqueduct Floods** (via GEE) | Global | Basin-level | Free via GEE (`WRI/Aqueduct_Flood_Hazard_Maps/V2`) | Riverine + coastal flood inundation depth maps for return periods (2-yr to 1000-yr) under current and future climate scenarios (SSP1/3/5 at 2030, 2050, 2080) |
| **FEMA NFHL** | US only | Parcel-level | Free ArcGIS REST, no API key (`hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer`) | Regulatory flood zones (A, AE, V, X), base flood elevation, floodway status — covers 90%+ US population. Authoritative US source |
| **OpenFEMA API** | US only | Record-level | Free REST, no API key (`fema.gov/api/open/v2/`) | 2M+ insurance claim records, disaster declarations, damage amounts — historical flood damage layer for US |

#### P1 — Post-MVP (high value, integrate after core is working)

| Source | Coverage | Resolution | Access Model | What It Provides |
|--------|----------|------------|-------------|-----------------|
| **Groundsource** (Google Research, 2025) | Global | Point-level | Free via GEE (`projects/sat-io/open-datasets/groundsource_2026`) or Zenodo | 2.6M geocoded flood events extracted from 5M+ news articles via Gemini LLMs (150+ countries, 2000–present). "Recent flood events" layer |
| **Google Flood Forecasting API** | 80+ countries | Gauge-level | Free but **waitlist-only** (pilot). Apply at `sites.research.google/gr/floodforecasting/api-waitlist/` | Real-time 7-day river forecasts, flood status, inundation maps, historical inundation (1999–2020), GRRR discharge reanalysis (1980–2023). Apply NOW, integrate when approved |
| **GloFAS / GFM (Copernicus CEMS)** | Global | 5km (forecast) / 10m (SAR) | Free (ECMWF registration, `cdsapi`). Batch job queue model | Raw river discharge ensembles (30-day), Sentinel-1 SAR near-real-time flood extent. Use directly only when Open-Meteo's wrapper is insufficient |
| **NASA VIIRS NRT Flood Product** (April 2025) | Global | 250m | Free (Earthdata login, LANCE) | Near-real-time satellite flood extent maps from NOAA-20/21, updated within 3 hours of satellite pass. HDF raster format |

#### P2 — Deferred (regional depth / specialized)

| Source | Coverage | Resolution | Access Model | What It Provides |
|--------|----------|------------|-------------|-----------------|
| **Global Flood Database** | Global | 250m | Free via GEE (`GLOBAL_FLOOD_DB/MODIS_EVENTS/V1`) | 913 mapped flood events (2000–2018). Stale — Groundsource is fresher for event data |
| **OpenTopography** | Global | 30m (SRTM/COP30) | Free REST API (free API key) | On-demand DEM subsetting. Skip for MVP — GEE already provides SRTM/COP30 |
| **HydroSHEDS** | Global | ~500m | Free GIS downloads, partially via GEE (`WWF/HydroSHEDS/*`) | River networks, drainage basins, flow accumulation. Useful for "which watershed" context |
| **USGS 3DEP** | US only | 1m–30m | Free (The National Map API) | Highest-res US elevation from LiDAR. Useful for precision flood modeling |
| **Copernicus Global Land Cover** | Global | 100m | Free download / GEE | Land use classification. Available in GEE, add when ML pipeline needs land cover input |

#### P3 — Future / Research

| Source | What It Provides |
|--------|-----------------|
| **NASA SEDAC** | Socioeconomic vulnerability overlays for flood equity analysis. Note: SEDAC contract disrupted April 2025, data migrating to Earthdata Cloud through end of 2026 — access is unreliable |
| **Fathom Global** | Commercial-grade flood maps (potential paid tier for SurgeInk Pro) |
| **STURM-Flood Dataset** (2025) | Open-access deep-learning-ready Sentinel-1/2 flood extent dataset — useful for training ML models, not a runtime data source |

### 2.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL DATA SOURCES                         │
│                                                                  │
│  Google Earth Engine         Open-Meteo Flood    FEMA / OpenFEMA│
│  ├─ JRC Surface Water        └─ River discharge  ├─ NFHL zones  │
│  ├─ WRI Aqueduct Floods        (wraps GloFAS)   └─ Claims data │
│  ├─ Groundsource (events)                                       │
│  ├─ SRTM / COP30 DEM        Google Flood API                   │
│  ├─ MODIS Land Cover         └─ Forecasts (when approved)       │
│  └─ Sentinel-1 GRD                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                          │
│                                                                  │
│  surgeink-ingest (Python)                                        │
│  ├─ GEE Python API (earthengine-api / geemap)                   │
│  ├─ HTTP clients for REST APIs (httpx)                           │
│  ├─ Coordinate alignment + CRS normalization                    │
│  ├─ Raster → GeoTIFF → tile conversion (PMTiles)               │
│  └─ Pre-processing for ML pipeline (normalize, extract, align)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐  ┌──────────────────────────┐
│   STATIC BASE LAYER  │  │    LIVE OVERLAY LAYER    │
│                      │  │                          │
│  Pre-computed tiles  │  │  Real-time API calls     │
│  ├─ ML risk predict. │  │  ├─ Open-Meteo discharge │
│  ├─ JRC water occur. │  │  ├─ Google Flood API *   │
│  ├─ WRI Aqueduct     │  │  ├─ FEMA NFHL zones     │
│  │   climate scenar. │  │  └─ OpenFEMA claims      │
│  └─ Served as        │  │                          │
│     PMTiles / raster │  │  Cached with TTL:        │
│     on Cloudflare R2 │  │  ├─ Discharge: 6hr       │
│                      │  │  ├─ Forecasts: 12hr      │
│                      │  │  └─ FEMA zones: 7 days   │
└──────────┬───────────┘  └────────────┬─────────────┘
           │                           │
           └────────────┬──────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SURGEINK API (FastAPI)                       │
│                                                                  │
│  /api/v1/risk       → Composite flood risk for bbox/coords      │
│  /api/v1/forecast   → Live river discharge + flood status       │
│  /api/v1/layers     → Available data layers for a location      │
│  /api/v1/tiles      → Vector/raster tile serving                │
│  /api/v1/predict    → On-demand ML inference                    │
│  /api/v1/interpret  → Model interpretability maps               │
│  /api/v1/geocode    → Location search (proxies Nominatim)       │
│                                                                  │
│  * Google Flood API = when approved (waitlist)                   │
│                                                                  │
│  Auth: API key (optional for public, required for heavy usage)  │
│  Cache: Redis (forecast/discharge TTL) + static tile CDN        │
│  Infra: Docker, deployable to any cloud or self-hosted          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              TERRAINK CARTOGRAPHIC ENGINE (Frontend)             │
│                                                                  │
│  React + TypeScript + MapLibre GL JS                             │
│  ├─ OpenFreeMap base tiles (roads, buildings, water, parks)     │
│  ├─ SurgeInk flood risk heatmap overlay (new layer)             │
│  ├─ Live discharge sparkline widget (new component)             │
│  ├─ Risk level legend + color scale (new component)             │
│  ├─ Layer toggle panel (flood risk, water history, forecast)    │
│  ├─ Theme system (TerraInk themes + flood-specific palettes)   │
│  ├─ Typography controls (city/country labels, Google Fonts)     │
│  └─ High-res PNG export with flood overlay baked in             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Dual Delivery Model

**Static base layer** — Pre-computed flood risk tiles:
- Run ML inference on ingested GEE data (DEM + land use + water bodies) per region
- Store as PMTiles (single-file tile archive) on Cloudflare R2 (free egress)
- Serve to MapLibre as a raster tile source — zero-cost, globally cached
- Rebuild weekly or on data update triggers
- Includes: ML risk predictions, JRC water occurrence, WRI Aqueduct climate scenarios

**Live overlay layer** — Real-time flood data:
- Poll Open-Meteo Flood API for river discharge (zero auth, JSON REST — primary MVP source)
- Poll Google Flood Forecasting API for flood status + inundation (richer, when approved from waitlist)
- Query FEMA NFHL via ArcGIS REST for US flood zones (no auth, direct)
- Query OpenFEMA for historical damage/claims data (no auth, REST)
- Cache responses in Redis with TTL (6hr discharge, 12hr forecasts, 7 days FEMA zones)

---

## 3. API Specification

### Base URL
```
https://api.surgeink.app/v1
```

### 3.1 `GET /risk`

Composite flood risk score for a location. Aggregates static risk (ML prediction + historical) with live data (discharge + forecast).

**Query params:**
```
lat       float   required    Latitude (-90 to 90)
lng       float   required    Longitude (-180 to 180)
radius    int     optional    Radius in meters (default: 5000, max: 50000)
layers    string  optional    Comma-separated: "ml,jrc,fema,forecast" (default: all available)
```

**Response:**
```json
{
  "location": { "lat": 41.8781, "lng": -87.6298, "name": "Chicago, IL" },
  "risk_score": 7.2,
  "risk_level": "high",
  "components": {
    "ml_prediction": {
      "score": 8,
      "confidence": 0.92,
      "model_version": "v1.0",
      "model_type": "flood_segmentation",
      "data_sources": ["landuse", "dem", "water_occurrence"]
    },
    "historical_flood_extent": {
      "source": "JRC Global Surface Water",
      "water_occurrence_pct": 12.4,
      "flood_events_nearby": 3,
      "last_flood_date": "2023-07-15"
    },
    "live_discharge": {
      "source": "Open-Meteo (GloFAS v4)",
      "river": "Chicago River",
      "current_m3s": 45.2,
      "mean_m3s": 28.1,
      "percentile": 89,
      "trend": "rising"
    },
    "forecast": {
      "source": "Google Flood Forecasting API",
      "flood_status": "warning",
      "7day_peak_m3s": 62.0,
      "inundation_map_available": true
    },
    "fema": {
      "zone": "AE",
      "bfe_ft": 12.5,
      "community": "Chicago, IL"
    }
  },
  "tile_urls": {
    "risk_heatmap": "https://tiles.surgeink.app/risk/{z}/{x}/{y}.mvt",
    "flood_extent": "https://tiles.surgeink.app/extent/{z}/{x}/{y}.mvt"
  },
  "generated_at": "2026-03-27T14:32:00Z"
}
```

### 3.2 `GET /forecast`

Live river discharge and flood forecast for a coordinate.

**Query params:**
```
lat            float   required
lng            float   required
forecast_days  int     optional    1–210 (default: 7)
include_history int    optional    Past days to include (default: 0, max: 92)
```

**Response:**
```json
{
  "river": "Chicago River",
  "source": "Open-Meteo GloFAS v4 + Google Flood Forecasting",
  "current_discharge_m3s": 45.2,
  "daily": [
    { "date": "2026-03-27", "discharge_m3s": 45.2, "flood_status": "normal" },
    { "date": "2026-03-28", "discharge_m3s": 52.1, "flood_status": "watch" },
    { "date": "2026-03-29", "discharge_m3s": 61.8, "flood_status": "warning" }
  ],
  "statistics": {
    "mean": 28.1,
    "median": 25.4,
    "p75": 38.0,
    "p90": 52.0,
    "period": "1984-2026"
  },
  "inundation": {
    "available": true,
    "url": "/api/v1/tiles/inundation/{z}/{x}/{y}.png"
  }
}
```

### 3.3 `GET /layers`

Available data layers for a given bounding box. Frontend calls this to know which toggles to show.

**Query params:**
```
bbox    string  required    "min_lng,min_lat,max_lng,max_lat"
zoom    int     optional    Map zoom level (affects layer availability)
```

**Response:**
```json
{
  "layers": [
    {
      "id": "ml_risk",
      "name": "ML Flood Risk Prediction",
      "type": "raster",
      "source": "SurgeInk ML v1.0",
      "tile_url": "https://tiles.surgeink.app/risk/{z}/{x}/{y}.png",
      "available": true,
      "legend": {
        "type": "gradient",
        "stops": [
          { "value": 1, "color": "#2166ac", "label": "Low" },
          { "value": 5, "color": "#f4a582", "label": "Moderate" },
          { "value": 10, "color": "#b2182b", "label": "Critical" }
        ]
      }
    },
    {
      "id": "jrc_water_occurrence",
      "name": "Historical Water Occurrence",
      "type": "raster",
      "source": "JRC Global Surface Water (1984–2021)",
      "tile_url": "https://tiles.surgeink.app/jrc/{z}/{x}/{y}.png",
      "available": true
    },
    {
      "id": "live_discharge",
      "name": "River Discharge (Live)",
      "type": "geojson",
      "source": "Open-Meteo / Google Flood Forecasting",
      "endpoint": "/api/v1/forecast",
      "available": true
    },
    {
      "id": "fema_zones",
      "name": "FEMA Flood Zones",
      "type": "vector",
      "source": "FEMA NFHL",
      "tile_url": "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer",
      "available": true,
      "region": "US only"
    },
    {
      "id": "sentinel1_flood_extent",
      "name": "Satellite Flood Extent (NRT)",
      "type": "raster",
      "source": "Copernicus GFM (Sentinel-1 SAR)",
      "available": false,
      "reason": "No active flood event in this area"
    },
    {
      "id": "interpretability",
      "name": "Model Interpretability Heatmap",
      "type": "raster",
      "source": "SurgeInk ML attention/feature importance",
      "tile_url": "https://tiles.surgeink.app/attention/{z}/{x}/{y}.png",
      "available": true
    }
  ]
}
```

### 3.4 `GET /tiles/{layer}/{z}/{x}/{y}.{format}`

Tile serving endpoint. Proxies pre-computed PMTiles or generates on-demand.

**Path params:**
```
layer   string   "risk" | "jrc" | "extent" | "attention" | "inundation"
z       int      Zoom level
x       int      Tile x
y       int      Tile y
format  string   "mvt" | "png" | "pbf"
```

**Headers:**
```
Cache-Control: public, max-age=86400    (static tiles)
Cache-Control: public, max-age=21600    (live tiles)
```

### 3.5 `POST /predict`

On-demand ML inference for a bounding box. Heavier compute — rate limited. The model architecture is an implementation detail; this endpoint abstracts it behind a stable interface.

**Request body:**
```json
{
  "bbox": [-87.75, 41.80, -87.55, 41.95],
  "return_interpretability": true,
  "output_format": "geotiff"
}
```

**Response:**
```json
{
  "job_id": "pred_abc123",
  "status": "processing",
  "estimated_seconds": 12,
  "poll_url": "/api/v1/predict/pred_abc123"
}
```

When complete:
```json
{
  "job_id": "pred_abc123",
  "status": "complete",
  "result": {
    "risk_map_url": "https://results.surgeink.app/pred_abc123/risk.tif",
    "interpretability_map_url": "https://results.surgeink.app/pred_abc123/interpret.tif",
    "metadata": {
      "model_version": "v1.0",
      "model_type": "flood_segmentation",
      "cell_count": 48,
      "inference_time_ms": 3200
    }
  }
}
```

### 3.6 `GET /interpret`

Retrieve model interpretability visualization for a location. Key differentiator — users can see *why* the model predicts risk, not just *what* it predicts. Implementation may use attention maps, SHAP, GradCAM, or feature importance depending on the model architecture chosen.

**Query params:**
```
lat       float   required
lng       float   required
method    string  optional    "attention" | "gradcam" | "feature_importance" (default: best available for current model)
```

**Response:**
```json
{
  "location": { "lat": 41.8781, "lng": -87.6298 },
  "interpretability_map": {
    "tile_url": "https://tiles.surgeink.app/interpret/{z}/{x}/{y}.png",
    "method": "attention",
    "shape": [56, 56],
    "interpretation": "High importance on low-elevation parcels near waterways and historical water occurrence areas"
  }
}
```

### 3.7 `GET /geocode`

Location search — proxies Nominatim (same as TerraInk) with flood context enrichment.

**Query params:**
```
q       string   required    Search query ("Chicago", "Mumbai", etc.)
limit   int      optional    Max results (default: 5)
```

**Response:**
```json
{
  "results": [
    {
      "name": "Chicago",
      "display_name": "Chicago, Cook County, Illinois, USA",
      "lat": 41.8781,
      "lng": -87.6298,
      "bbox": [-87.9401, 41.6445, -87.5240, 42.0230],
      "flood_data_available": true,
      "available_layers": ["ml_risk", "jrc_water_occurrence", "live_discharge", "fema_zones", "interpretability"]
    }
  ]
}
```

---

## 4. Tech Stack

### Backend (Python — lives alongside frontend in monorepo)
```
Python 3.11+
├── FastAPI                  — API framework
├── earthengine-api          — Google Earth Engine Python client
├── geemap                   — Interactive GEE mapping + data export
├── httpx                    — Async HTTP client (Open-Meteo, FEMA, Google Flood API)
├── rasterio                 — GeoTIFF read/write
├── geopandas                — Geospatial dataframes
├── shapely                  — Geometry operations
├── pyproj                   — Coordinate transformations
├── torch                    — PyTorch (ML inference — model architecture TBD)
├── numpy                    — Array ops
├── pillow                   — Image processing
├── redis (aioredis)         — Caching layer
├── pmtiles                  — PMTiles read/write for tile serving
├── uvicorn                  — ASGI server
└── celery (optional)        — Background task queue for /predict jobs
```

### Frontend (extended from TerraInk — existing structure at repo root)
```
React + TypeScript
├── MapLibre GL JS           — Map renderer (inherited from TerraInk)
├── OpenFreeMap tiles        — Base map tiles (inherited)
├── Nominatim                — Geocoding (inherited)
├── @deck.gl/layers          — Optional: advanced data viz layers
├── recharts                 — Discharge sparkline charts
└── Bun + Vite               — Build tooling (inherited)
```

### Infrastructure
```
Docker + Docker Compose
├── surgeink-api             — FastAPI backend container
├── surgeink-frontend        — Nginx serving built React app
├── redis                    — Cache container
└── surgeink-worker          — Celery worker for ML inference (optional)

Tile Hosting: Cloudflare R2 (S3-compatible, free egress)
CDN: Cloudflare (fronting R2 + API)
```

---

## 5. Repository Structure

Monorepo — frontend (TerraInk) stays at root, Python backend lives in `server/`.

```
surgeink/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint, test, build (frontend + backend)
│       └── deploy.yml                 # Docker build + push
│
│   # ── Frontend (TerraInk — existing structure, untouched) ──
│
├── src/                               # Existing TerraInk frontend
│   ├── core/                          # Ports, adapters, config, services
│   ├── features/                      # Vertical feature slices
│   │   ├── poster/                    # Core state (PosterContext)
│   │   ├── location/                  # Geocoding, search
│   │   ├── map/                       # MapLibre rendering
│   │   ├── theme/                     # Color themes
│   │   ├── layout/                    # Poster layouts
│   │   ├── export/                    # PNG/SVG/PDF export
│   │   ├── markers/                   # Custom map pins
│   │   ├── install/                   # PWA install
│   │   └── flood/                     # NEW: flood risk layers, legends, charts
│   │       ├── domain/               # Flood types, ports
│   │       ├── application/          # useFloodLayers, useDischarge hooks
│   │       ├── infrastructure/       # SurgeInk API client adapter
│   │       └── ui/                   # FloodRiskOverlay, RiskLegend, DischargeChart, RiskScoreCard
│   ├── shared/                        # Geo math, utils, UI atoms
│   ├── data/                          # Static JSON (themes, layouts)
│   ├── styles/                        # Global CSS + flood-themes.css (NEW)
│   └── types/
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.js
│
│   # ── Backend (Python — new) ──
│
├── server/
│   ├── surgeink/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entrypoint
│   │   ├── config.py                  # Settings (env vars, API keys)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py              # Top-level API router
│   │   │   ├── risk.py                # GET /risk
│   │   │   ├── forecast.py            # GET /forecast
│   │   │   ├── layers.py              # GET /layers
│   │   │   ├── tiles.py               # GET /tiles/{layer}/{z}/{x}/{y}
│   │   │   ├── predict.py             # POST /predict
│   │   │   ├── interpret.py           # GET /interpret
│   │   │   └── geocode.py             # GET /geocode
│   │   ├── data/
│   │   │   ├── __init__.py
│   │   │   ├── gee_client.py          # Earth Engine wrapper
│   │   │   ├── openmeteo.py           # Open-Meteo Flood API client
│   │   │   ├── google_flood.py        # Google Flood Forecasting API client (when approved)
│   │   │   ├── fema.py                # FEMA NFHL / OpenFEMA client
│   │   │   └── ingest.py              # Data ingestion pipeline
│   │   ├── ml/
│   │   │   ├── __init__.py
│   │   │   ├── model.py               # Model definition (architecture TBD)
│   │   │   ├── inference.py           # Inference pipeline (model-agnostic interface)
│   │   │   ├── interpretability.py    # Attention / GradCAM / feature importance
│   │   │   ├── preprocessing.py       # Input preprocessing (normalize, extract, align)
│   │   │   └── postprocessing.py      # Risk map assembly from model output
│   │   ├── tiles/
│   │   │   ├── __init__.py
│   │   │   ├── generator.py           # Tile generation from predictions
│   │   │   ├── pmtiles_writer.py      # PMTiles archive creation
│   │   │   └── server.py              # Tile serving logic
│   │   ├── cache/
│   │   │   ├── __init__.py
│   │   │   └── redis_cache.py         # Redis caching with TTL
│   │   └── models/
│   │       └── schemas.py             # Pydantic request/response models
│   ├── tests/
│   │   ├── test_risk.py
│   │   ├── test_forecast.py
│   │   ├── test_gee_client.py
│   │   └── test_inference.py
│   ├── weights/                       # ML model weights (git-lfs or download script)
│   │   └── .gitkeep
│   ├── scripts/
│   │   ├── download_weights.py        # Pull model weights from storage
│   │   ├── ingest_region.py           # Batch ingest data for a region
│   │   └── generate_tiles.py          # Pre-compute tiles for a region
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── requirements.txt
│
│   # ── Shared / Root ──
│
├── docker-compose.yml                 # Full stack: frontend + backend + redis
├── .env.example
├── .gitignore
├── agent.md
├── CLAUDE.md
├── CONTRIBUTING.md
├── SURGEINK_SPEC.md
├── LICENSE                            # MIT
├── README.md
└── TRADEMARK.md
```

---

## 6. ML Model — Objectives and Approach

### Objective

Produce a per-pixel flood risk score (1–10) for any location globally, given geospatial input features. The model architecture is an implementation decision, not a constraint — what matters is the interface and the objectives below.

### Requirements

1. **Input:** Multi-channel geospatial tile (DEM, land use/cover, water occurrence, proximity to waterways)
2. **Output:** Risk segmentation map — per-pixel flood risk level (1–10 scale)
3. **Interpretability:** The model must support some form of explanation (attention maps, GradCAM, SHAP, feature importance) so users can see *why* a pixel is high-risk
4. **Inference speed:** < 5 seconds per 224×224 tile for interactive use; batch mode for pre-computing tiles
5. **Swappable:** The inference pipeline must abstract the model behind a stable interface (`model.py` + `inference.py`) so architectures can be swapped without changing the API layer

### Prior Work

The original research paper (Karim, Reddy, Singh — CS584, IIT, 2023) used TransUNet with a Segformer backbone and achieved 96% test accuracy on Chicago data with 10-class flood risk segmentation. This is a valid starting point but not the only option. Alternatives to evaluate:

| Architecture | Pros | Cons |
|---|---|---|
| **TransUNet (Segformer backbone)** | Proven on this task (96% acc), attention maps built-in | Complex, heavy for inference, Chicago-only training data |
| **U-Net / U-Net++** | Simpler, faster, well-understood for segmentation | No built-in attention; interpretability requires add-ons |
| **DeepLabV3+** | Strong for semantic segmentation, efficient | Less suited for multi-scale geospatial features |
| **Segformer (standalone)** | Lightweight transformer, fast inference | Newer, less battle-tested for flood risk specifically |
| **Ensemble / stacking** | Combine model strengths | Complexity, slower inference |
| **Non-ML baseline** | Weighted overlay of JRC + DEM + distance-to-water | No training needed, interpretable by default, good MVP baseline |

**Recommendation for MVP:** Start with a non-ML weighted overlay (JRC water occurrence + DEM elevation + distance to waterways from HydroSHEDS). This provides an immediately useful risk layer with zero training. Then layer in ML models as accuracy improvements over this baseline.

### Training Data Sources (via GEE)

For any ML model, the input features can be sourced globally from GEE:
- **Land use/cover** → `MODIS/061/MCD12Q1` (MODIS Land Cover) or Copernicus Global Land Cover
- **DEM / elevation** → `USGS/SRTMGL1_003` (SRTM 30m) or `MERIT/DEM/v1_0_3`
- **Water occurrence** → `JRC/GSW1_4/GlobalSurfaceWater` occurrence band
- **River networks** → `WWF/HydroSHEDS` (flow accumulation, drainage basins)
- **Flood risk labels** → JRC occurrence band + WRI Aqueduct risk scores (composite label)

### Original Training Data (Chicago, from paper)
- Source: Chicago Metropolitan Agency for Planning (CMAP)
- Land use: 59 classes, 2.5M parcels
- Riverine index: Water body locations + catchment areas
- Basal flood elevation: Properties within 1500ft buffer, elevation within 6ft of 10-year flood zone
- Flood risk labels: 10 levels (higher = more risk)
- Preprocessing: ArcGIS → TIF export → Python (grayscale, inversion, normalization)
- Cell size: 224×224, stride: 64

---

## 7. Frontend Integration

### New MapLibre Layers

SurgeInk adds these layers to TerraInk's existing map:

```typescript
// FloodRiskOverlay.tsx — add risk heatmap as a MapLibre source + layer
map.addSource('surgeink-risk', {
  type: 'raster',
  tiles: ['https://tiles.surgeink.app/risk/{z}/{x}/{y}.png'],
  tileSize: 256,
  maxzoom: 14
});

map.addLayer({
  id: 'flood-risk-heatmap',
  type: 'raster',
  source: 'surgeink-risk',
  paint: {
    'raster-opacity': 0.6  // Adjustable via UI slider
  }
}, 'waterway-label');  // Insert below labels
```

### New UI Components

1. **Layer toggle panel** — Sidebar section with checkboxes for each flood layer (risk, water history, live discharge, FEMA zones, interpretability). Inherits TerraInk's sidebar styling.

2. **Risk score card** — Floating card showing composite risk score for map center, with breakdown by source. Updates on map pan/zoom.

3. **Discharge sparkline** — Small chart showing 7-day river discharge trend for nearest gauged river. Uses recharts.

4. **Risk legend** — Gradient color bar (blue → yellow → red) with risk level labels. Positioned bottom-left, styled to match TerraInk poster aesthetic.

5. **Opacity slider** — Per-layer opacity control so flood data doesn't obscure the base map.

### Poster Export Enhancement

TerraInk's PNG export is extended to:
- Bake active flood layers into the exported image
- Add a "Flood Risk" subtitle below the city name
- Include the risk legend in the poster margin
- Optional: add data source attribution line

---

## 8. Implementation Phases

### Phase 1 — Foundation (Weeks 1–3)
**Goal:** Set up backend skeleton in monorepo, get first data flowing end-to-end.

- [ ] Create `server/` directory with FastAPI project structure
- [ ] Set up Docker Compose (api + redis + frontend)
- [ ] Implement `GET /geocode` (proxy Nominatim — proves API works)
- [ ] Implement `GET /forecast` using Open-Meteo Flood API (zero auth, instant)
- [ ] Implement `GET /layers` (hardcoded initially, lists available data for a location)
- [ ] Register GEE project + set up authentication, basic `gee_client.py` wrapper
- [ ] Apply for Google Flood Forecasting API pilot (waitlist — do this NOW)
- [ ] Frontend: add `flood` feature slice (domain, application, infrastructure, ui)
- [ ] Frontend: add discharge sparkline component (recharts)
- [ ] Frontend: add basic layer toggle UI in settings panel

### Phase 2 — Static Risk Layer (Weeks 4–6)
**Goal:** Non-ML weighted risk overlay + pre-computed tiles for Chicago (and eventually global).

- [ ] Build weighted overlay risk model: JRC water occurrence + DEM elevation + distance-to-waterways
- [ ] Implement preprocessing pipeline (GEE data → normalized input)
- [ ] Generate risk map GeoTIFFs for Chicago region
- [ ] Convert to PMTiles, upload to Cloudflare R2
- [ ] Implement `GET /tiles` endpoint for serving
- [ ] Frontend: add `FloodRiskOverlay` MapLibre raster layer
- [ ] Frontend: add `RiskLegend` component
- [ ] Frontend: layer opacity controls

### Phase 3 — Composite Risk + Live Data (Weeks 7–9)
**Goal:** Full `/risk` endpoint combining static + live sources. FEMA integration.

- [ ] Implement `GET /risk` with composite scoring logic
- [ ] Integrate FEMA NFHL (ArcGIS REST — US flood zones, no auth)
- [ ] Integrate OpenFEMA API (historical damage/claims data)
- [ ] Integrate JRC Global Surface Water via GEE (historical water occurrence layer)
- [ ] Implement Redis caching for live data (TTL per source)
- [ ] Frontend: add `RiskScoreCard` component
- [ ] Frontend: FEMA flood zone layer overlay
- [ ] Integrate Google Flood Forecasting API (if approved by now)

### Phase 4 — ML Model + Interpretability (Weeks 10–12)
**Goal:** Train/evaluate ML model, add interpretability, enhance poster export.

- [ ] Evaluate model architectures against non-ML baseline (see Section 6)
- [ ] Implement model training pipeline with GEE-sourced global data
- [ ] Implement `POST /predict` for on-demand inference (async with Celery)
- [ ] Implement `GET /interpret` — model interpretability visualization
- [ ] Frontend: interpretability heatmap toggle layer
- [ ] Enhance poster export with flood layers baked in
- [ ] Integrate Groundsource (Google Research) — recent flood events layer
- [ ] Documentation, README, API docs (Swagger auto-generated by FastAPI)

### Phase 5 — Scale + Polish (Weeks 13+)
**Goal:** Expand coverage, optimize performance, production hardening.

- [ ] Batch tile generation pipeline for major metro areas worldwide
- [ ] WRI Aqueduct future climate scenarios integration (2030/2050/2080)
- [ ] Performance optimization (tile caching, inference batching, CDN warmup)
- [ ] VIIRS NRT satellite flood extent integration (near-real-time)
- [ ] Self-hosting docs + Docker deployment guide

---

## 9. Environment Variables

```bash
# Backend
SURGEINK_ENV=development                    # development | production
SURGEINK_API_HOST=0.0.0.0
SURGEINK_API_PORT=8000

# Google Earth Engine
GEE_SERVICE_ACCOUNT=surgeink@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY_FILE=/secrets/gee-key.json

# Google Flood Forecasting API (when approved from waitlist)
GOOGLE_FLOOD_API_KEY=your-gcp-api-key

# Redis
REDIS_URL=redis://redis:6379/0

# Tile Storage (Cloudflare R2)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=surgeink-tiles

# Data source base URLs (defaults shown — override for self-hosted or proxied instances)
OPENMETEO_BASE_URL=https://flood-api.open-meteo.com
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
FEMA_NFHL_BASE_URL=https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer
OPENFEMA_BASE_URL=https://www.fema.gov/api/open/v2

# Optional
SENTRY_DSN=                                 # Error tracking
```

---

## 10. References

- **Original ML paper:** Karim, Reddy, Singh. "Machine Learning for Flood Prediction and Mitigation Using Transformer Architectures." CS584 Final Project, IIT. 2023.
- **TerraInk (upstream):** https://github.com/yousifamanuel/terraink
- **Google Earth Engine:** https://developers.google.com/earth-engine
- **GEE Noncommercial Tiers (April 2026):** https://developers.google.com/earth-engine/guides/noncommercial_tiers
- **Google Flood Forecasting:** https://developers.google.com/flood-forecasting
- **Google Flood API Waitlist:** https://sites.research.google/gr/floodforecasting/api-waitlist/
- **GloFAS:** https://global-flood.emergency.copernicus.eu
- **Open-Meteo Flood API:** https://open-meteo.com/en/docs/flood-api
- **JRC Global Surface Water:** Pekel et al., Nature 540, 418–422 (2016)
- **Global Flood Database:** Tellman et al., Nature (2021)
- **Groundsource (Google Research, 2025):** 2.6M geocoded flood events from news articles
- **FEMA NFHL:** https://www.fema.gov/flood-maps/national-flood-hazard-layer
- **FEMA NFHL ArcGIS REST:** https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer
- **OpenFEMA API:** https://www.fema.gov/about/openfema/api
- **WRI Aqueduct Floods:** https://www.wri.org/data/aqueduct-floods
- **ee-fastapi (reference implementation):** https://github.com/csaybar/ee-fastapi
- **geemap:** Wu, Q. JOSS, 5(51), 2305 (2020)
- **HydroSHEDS:** https://www.hydrosheds.org

---

## 11. Immediate Action Items

1. **Apply for Google Flood Forecasting API pilot** — waitlist form at https://sites.research.google/gr/floodforecasting/api-waitlist/ (takes weeks/months, do this NOW)
2. **Register GEE project** — https://earthengine.google.com (free community tier: 150 EECU-hours/month, quota tiers effective April 27, 2026)
3. **Test Open-Meteo Flood API** — zero-auth, can start immediately:
   ```bash
   curl "https://flood-api.open-meteo.com/v1/flood?latitude=41.88&longitude=-87.63&daily=river_discharge"
   ```
4. **Test FEMA NFHL** — zero-auth, spatial query:
   ```bash
   curl "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=-87.63,41.88&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=*&f=json"
   ```
5. **Test OpenFEMA API** — zero-auth, disaster declarations:
   ```bash
   curl "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?\$filter=state%20eq%20%27Illinois%27&\$top=5"
   ```
6. **Set up GEE credentials** — service account + private key JSON for backend
7. **Create `server/` directory** — FastAPI project structure, `pyproject.toml`, Docker Compose
