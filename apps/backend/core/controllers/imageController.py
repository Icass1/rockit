from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from core.framework.objectFiles import ObjectFiles
from core.framework.storage import Storage
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware

router = APIRouter(
    prefix="/image",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Image"],
)


@router.get("/{path}")
async def get_image_async(request: Request, path: str) -> StreamingResponse:
    session = DBSessionMiddleware.get_session(request=request)
    stored = await Storage.get_object_from_key_async(session=session, key=path)
    if stored.is_not_ok():
        raise HTTPException(status_code=stored.get_http_code(), detail=stored.message())
    response = await ObjectFiles.stream_async(key=stored.result().key)
    if response.is_not_ok():
        raise HTTPException(status_code=response.get_http_code(), detail=response.message())
    return response.result()
