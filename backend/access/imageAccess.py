
from backend.aResult import AResult
from backend.db.ormModels.main.internalImage import InternalImageRow
from backend.init import rockit_db


class ImageAccess:

    @staticmethod
    def get_image_path_from_public_id(public_id: str) -> AResult[str]:
        with rockit_db.session_scope() as s:
            image = s.query(InternalImageRow).where(
                InternalImageRow.public_id == public_id).first()

            if not image:
                return AResult(AResult.NOT_FOUND, "Image not found")

            return AResult(AResult.OK, "OK", image.path)
