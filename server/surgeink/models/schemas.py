from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# --- Geocode ---

class GeocodeResult(BaseModel):
    name: str
    display_name: str
    lat: float
    lng: float
    bbox: list[float]  # [min_lng, min_lat, max_lng, max_lat]
    flood_data_available: bool = True
    available_layers: list[str] = []


class GeocodeResponse(BaseModel):
    results: list[GeocodeResult]


# --- Forecast ---

class ForecastDaily(BaseModel):
    date: str
    discharge_m3s: Optional[float]


class ForecastStatistics(BaseModel):
    mean: Optional[float]
    median: Optional[float]
    p75: Optional[float]
    p90: Optional[float]
    period: str


class ForecastResponse(BaseModel):
    latitude: float
    longitude: float
    source: str
    current_discharge_m3s: Optional[float]
    daily: list[ForecastDaily]
    statistics: Optional[ForecastStatistics] = None


# --- Layers ---

class LayerLegendStop(BaseModel):
    value: float
    color: str
    label: str


class LayerLegend(BaseModel):
    type: str
    stops: list[LayerLegendStop]


class LayerInfo(BaseModel):
    id: str
    name: str
    type: str
    source: str
    available: bool
    tile_url: Optional[str] = None
    endpoint: Optional[str] = None
    region: Optional[str] = None
    legend: Optional[LayerLegend] = None
    reason: Optional[str] = None


class LayersResponse(BaseModel):
    layers: list[LayerInfo]
