from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/predict")
async def predict():
    raise HTTPException(501, detail="Not implemented yet — Phase 4")
