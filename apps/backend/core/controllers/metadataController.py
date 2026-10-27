from fastapi import APIRouter, Depends, HTTPException, Query, Request

from core.aResult import AResultCode
from core.framework.metadata.metadata import Metadata
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.responses.metadataResponse import MetadataResponse
from logger import getLogger

logger = getLogger(__name__)
router = APIRouter(prefix="/metadata", tags=["Metadata"])


@router.get("/{provider}/artists/search")
async def search_artists(
    request: Request,
    provider: str,
    name: str = Query(min_length=1, max_length=200),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    refresh: bool = False,
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> MetadataResponse:
    """Find external identities without assigning them to a local artist."""
    session = DBSessionMiddleware.get_session(request=request)
    # Authentication has completed. Release its read transaction before a
    # provider waits on external IO or opens an independent cache transaction.
    # Otherwise concurrent requests can each hold a pool connection while
    # waiting for a second connection, starving the entire backend.
    await session.commit()
    result = await Metadata.search_artists_async(
        session=session,
        provider=provider,
        name=name,
        offset=offset,
        limit=limit,
        refresh=refresh,
    )
    if result.is_not_ok():
        logger.error(f"Artist metadata search failed: {result.info()}")
        headers = (
            {"Retry-After": "60"}
            if result.code() in (AResultCode.SERVICE_UNAVAILABLE, AResultCode.RATE_LIMITED)
            else None
        )
        raise HTTPException(
            status_code=result.get_http_code(), detail=result.message(), headers=headers
        )
    return result.result()


@router.get("/{provider}/{entity}/{external_id}")
async def get_metadata(
    request: Request,
    provider: str,
    entity: str,
    external_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    refresh: bool = False,
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> MetadataResponse:
    """Read a durable external metadata snapshot; refresh is explicit and rate limited."""
    session = DBSessionMiddleware.get_session(request=request)
    await session.commit()
    result = await Metadata.get_async(
        session=session,
        provider=provider,
        entity=entity,
        external_id=external_id,
        offset=offset,
        limit=limit,
        refresh=refresh,
    )
    if result.is_not_ok():
        logger.error(f"Metadata lookup failed: {result.info()}")
        headers = (
            {"Retry-After": "60"}
            if result.code() in (AResultCode.SERVICE_UNAVAILABLE, AResultCode.RATE_LIMITED)
            else None
        )
        raise HTTPException(
            status_code=result.get_http_code(), detail=result.message(), headers=headers
        )
    return result.result()
