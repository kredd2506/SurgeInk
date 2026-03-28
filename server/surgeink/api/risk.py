from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/risk")
async def get_risk():
    raise HTTPException(501, detail="Not implemented yet — Phase 3")
