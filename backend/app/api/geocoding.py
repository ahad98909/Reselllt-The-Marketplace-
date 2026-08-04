from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional
from app.core.geocoding import search_nominatim_address, reverse_geocode_coords

router = APIRouter(prefix="/geocoding", tags=["geocoding"])

@router.get("/search")
def search_location(q: str = Query(...)):
    results = search_nominatim_address(q)
    if results is None:
        raise HTTPException(status_code=500, detail="Failed to query location provider")
    return results

@router.get("/reverse")
def reverse_geocode(lat: float = Query(...), lon: float = Query(...)):
    result = reverse_geocode_coords(lat, lon)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to reverse geocode coordinates")
    return result
