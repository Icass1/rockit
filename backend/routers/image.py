from fastapi import APIRouter, HTTPException
import os

from fastapi.responses import FileResponse

from backend.constants import IMAGES_PATH
from backend.db.ormModels.internalImage import InternalImageRow

from backend.initDb import rockit_db


router = APIRouter(prefix="/image")


@router.get("/{public_id}")
def get_image(public_id: str):

    with rockit_db.session_scope() as s:
        image = s.query(InternalImageRow).where(
            InternalImageRow.public_id == public_id).first()

        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        return FileResponse(os.path.join(IMAGES_PATH, image.path))
