"""
Radio Browser API proxy.

Proxies requests to the public Radio Browser API to avoid CORS issues
on the frontend.

Docs: https://de1.api.radio-browser.info/
"""

from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException, Query
from logging import Logger

from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

RADIO_BROWSER_BASE = "https://de1.api.radio-browser.info/json"

ALLOWED_SEARCH_TYPES = {"byname", "bytag", "bycountry", "byuuid"}

router = APIRouter(prefix="/radio")


@router.get("/stations/{search_by}/{search_term}")
async def search_stations(
    search_by: str,
    search_term: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> List[Dict[str, Any]]:
    if search_by not in ALLOWED_SEARCH_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid search type '{search_by}'. Allowed: {', '.join(sorted(ALLOWED_SEARCH_TYPES))}",
        )

    if not search_term.strip():
        return []

    url = f"{RADIO_BROWSER_BASE}/stations/{search_by}/{search_term}"
    params = {
        "limit": limit,
        "offset": offset,
        "hidebroken": "true",
        "order": "clickcount",
        "reverse": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    except httpx.TimeoutException:
        logger.warning(f"Radio Browser API timeout: {search_by}/{search_term}")
        raise HTTPException(status_code=504, detail="Radio Browser API timed out")

    except httpx.HTTPStatusError as e:
        logger.error(f"Radio Browser API HTTP error: {e.response.status_code}")
        raise HTTPException(status_code=502, detail="Radio Browser API error")

    except Exception as e:
        logger.error(f"Unexpected error fetching radio stations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch radio stations")
