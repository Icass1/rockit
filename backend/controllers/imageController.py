from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from logging import Logger
import os

from backend.aResult import AResult
from backend.access.imageAccess import ImageAccess

from backend.utils.logger import getLogger

from backend.constants import IMAGES_PATH


logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/image")


@router.get("/{image_public_id}")
async def serach(image_public_id: str) -> FileResponse:

    a_result_image_url: AResult[str] = ImageAccess.get_image_path_from_public_id(
        public_id=image_public_id)

    if a_result_image_url.is_not_ok():
        raise HTTPException(
            status_code=a_result_image_url.get_http_code(), detail="Image not found")

    return FileResponse(os.path.join(IMAGES_PATH, a_result_image_url.result))
