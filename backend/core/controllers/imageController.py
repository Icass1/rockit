import os
from fastapi import Depends, APIRouter, Request

from fastapi.responses import FileResponse

from backend.constants import IMAGES_PATH

from backend.core.middlewares.authMiddleware import AuthMiddleware

router = APIRouter(
    prefix="/image", dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("/{path}")
async def get_session(request: Request, path: str) -> FileResponse:
    image_path = os.path.join(IMAGES_PATH, path)

    return FileResponse(path=image_path)
