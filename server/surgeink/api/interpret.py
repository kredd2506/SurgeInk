from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/interpret")
async def get_interpret():
    raise HTTPException(501, detail="Not implemented yet — Phase 4")
