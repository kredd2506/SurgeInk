from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/tiles/{layer}/{z}/{x}/{y}.{fmt}")
async def get_tile(layer: str, z: int, x: int, y: int, fmt: str):
    raise HTTPException(501, detail="Not implemented yet — Phase 2")
