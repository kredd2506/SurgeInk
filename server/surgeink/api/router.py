from fastapi import APIRouter

from surgeink.api import geocode, forecast, layers, risk, tiles, predict, interpret

router = APIRouter(prefix="/api/v1")

router.include_router(geocode.router, tags=["geocode"])
router.include_router(forecast.router, tags=["forecast"])
router.include_router(layers.router, tags=["layers"])
router.include_router(risk.router, tags=["risk"])
router.include_router(tiles.router, tags=["tiles"])
router.include_router(predict.router, tags=["predict"])
router.include_router(interpret.router, tags=["interpret"])
