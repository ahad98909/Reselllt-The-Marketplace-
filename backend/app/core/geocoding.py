import httpx
from typing import Optional, Tuple

def geocode_address(address: str) -> Tuple[Optional[float], Optional[float]]:
    if not address:
        return None, None
    try:
        headers = {"User-Agent": "SecondHandMarketplaceApp/1.0"}
        # Restrict standard address searches to Pakistan to prevent mapping to other countries
        url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1&countrycodes=pk"
        response = httpx.get(url, headers=headers, timeout=10.0)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"Geocoding failed for '{address}': {e}")
    return None, None

def reverse_geocode_coords(lat: float, lon: float) -> Optional[dict]:
    try:
        headers = {"User-Agent": "SecondHandMarketplaceApp/1.0"}
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1"
        response = httpx.get(url, headers=headers, timeout=10.0)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Reverse geocoding failed: {e}")
    return None

def search_nominatim_address(query: str) -> Optional[list]:
    try:
        headers = {"User-Agent": "SecondHandMarketplaceApp/1.0"}
        # Restrict searches to Pakistan boundaries
        url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5&countrycodes=pk"
        response = httpx.get(url, headers=headers, timeout=10.0)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Nominatim search failed: {e}")
    return None
