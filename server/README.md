---
title: SurgeInk API
emoji: 🌊
colorFrom: blue
colorTo: red
sdk: docker
app_port: 8000
pinned: false
license: mit
---

# SurgeInk API

FastAPI backend for [SurgeInk](https://github.com/kredd2506/SurgeInk) — flood + disaster risk visualization. Proxies FEMA NFHL flood zones, NASA EONET disaster events, Open-Meteo river discharge forecasts, and Nominatim geocoding.

## Endpoints

- `GET /api/health` — health check
- `GET /api/v1/geocode?q=...` — Nominatim proxy
- `GET /api/v1/forecast?lat=...&lng=...` — Open-Meteo river discharge
- `GET /api/v1/fema/zones?bbox=...` — FEMA flood zones (US, GeoJSON)
- `GET /api/v1/disasters?categories=...` — NASA EONET active events
- `GET /api/v1/layers?bbox=...` — Layer catalog

API docs: [/api/docs](/api/docs)

## Stack

- Python 3.11 + FastAPI + uvicorn
- httpx for async external requests
- pydantic-settings for config
- Redis (optional, graceful degradation if unavailable)
