from fastapi import Depends, APIRouter, HTTPException, Request
from fastapi.responses import Response
from backend.core.framework.media.image import Image
from backend.core.framework.storage import Storage
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger

logger = getLogger(__name__)
router = APIRouter(
    prefix="/image",
    dependencies=[Depends(AuthMiddleware.auth_dependency)],
    tags=["Core", "Image"],
)


@router.api_route("/{path:path}", methods=["GET", "HEAD"])
async def get_image_async(request: Request, path: str) -> Response:
    found = await Image.get_image_from_path_async(
        session=DBSessionMiddleware.get_session(request=request), path=path
    )
    if found.is_not_ok():
        logger.error(found.info())
        raise HTTPException(status_code=found.get_http_code(), detail=found.message())
    streamed = await Storage.stream_async(
        storage_object=found.result().storage_object,
        range_header=request.headers.get("range"),
        head_only=request.method == "HEAD",
    )
    if streamed.is_not_ok():
        logger.error(streamed.info())
        raise HTTPException(
            status_code=streamed.get_http_code(), detail=streamed.message()
        )
    return streamed.result()
