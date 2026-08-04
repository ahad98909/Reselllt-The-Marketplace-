import httpx
import random
from typing import Optional, Tuple

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
]

def geocode_address(address: str) -> Tuple[Optional[float], Optional[float]]:
    if not address:
        return None, None
    try:
        headers = {"User-Agent": random.choice(USER_AGENTS)}
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
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1"
        response = httpx.get(url, headers=headers, timeout=10.0)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Reverse geocoding failed: {e}")
    return None

def search_nominatim_address(query: str) -> Optional[list]:
    try:
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        # Restrict searches to Pakistan boundaries
        url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5&countrycodes=pk"
        response = httpx.get(url, headers=headers, timeout=10.0)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Nominatim search failed: {e}")
    return None
