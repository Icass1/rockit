import asyncio
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.aResult import AResult, AResultCode
from backend.core.access.uploadItemAccess import UploadItemAccess
from backend.core.framework.storage import Storage, CHUNK_SIZE
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class UploadStaging:
    @staticmethod
    async def save_path_async(
        session: AsyncSession, upload_id: str, user_id: int, name: str, path: str
    ) -> AResultCode:
        """Persist a staged file independently of the backend worker's scratch disk."""
        stored = await Storage.upload_file_async(
            session=session, path=path, folder="staging", original_key=name
        )
        if stored.is_not_ok():
            logger.error(stored.info())
            return AResultCode(code=stored.code(), message=stored.message())
        saved = await UploadItemAccess.save_async(
            session=session,
            upload_id=upload_id,
            user_id=user_id,
            name=name,
            storage_object_id=stored.result().id,
        )
        if saved.is_not_ok():
            logger.error(saved.info())
            return AResultCode(code=saved.code(), message=saved.message())
        previous = saved.result()[1]
        if previous is not None:
            deleted = await Storage.delete_async(
                session=session, storage_object=previous
            )
            if deleted.is_not_ok():
                logger.error(deleted.info())
                return deleted
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def restore_async(
        session: AsyncSession, upload_id: str, user_id: int, directory: str
    ) -> AResultCode:
        """Restore staged items in one metadata query for processing after a restart."""
        found = await UploadItemAccess.list_async(
            session=session, upload_id=upload_id, user_id=user_id
        )
        if found.is_not_ok():
            logger.error(found.info())
            return AResultCode(code=found.code(), message=found.message())
        root = Path(directory).resolve()
        for item in found.result():
            target = (root / item.name).resolve()
            if not target.is_relative_to(root):
                logger.warning("Invalid staged item name")
                return AResultCode(
                    code=AResultCode.BAD_REQUEST, message="Invalid staged item"
                )
            local = await Storage.materialize_async(storage_object=item.storage_object)
            if local.is_not_ok():
                logger.error(local.info())
                return AResultCode(code=local.code(), message=local.message())
            target.parent.mkdir(parents=True, exist_ok=True)
            os.replace(local.result(), target)
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def clear_async(
        session: AsyncSession, upload_id: str, user_id: int
    ) -> AResultCode:
        found = await UploadItemAccess.list_async(
            session=session, upload_id=upload_id, user_id=user_id
        )
        if found.is_not_ok():
            logger.error(found.info())
            return AResultCode(code=found.code(), message=found.message())
        objects = [item.storage_object for item in found.result()]
        removed = await UploadItemAccess.remove_async(
            session=session, rows=found.result()
        )
        if removed.is_not_ok():
            logger.error(removed.info())
            return removed
        for obj in objects:
            removed = await Storage.delete_async(session=session, storage_object=obj)
            if removed.is_not_ok():
                logger.error(removed.info())
                return removed
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def assemble_async(
        session: AsyncSession, upload_id: str, user_id: int, total: int, output: str
    ) -> AResult[str]:
        """Assemble staged chunks in numeric order, rejecting gaps and invalid counts."""
        found = await UploadItemAccess.list_async(
            session=session, upload_id=upload_id, user_id=user_id
        )
        if found.is_not_ok():
            logger.error(found.info())
            return AResult(code=found.code(), message=found.message())
        parts = {
            item.name: item.storage_object
            for item in found.result()
            if item.name.startswith("chunks/")
        }
        if total <= 0 or set(parts) != {f"chunks/{i}" for i in range(total)}:
            logger.warning("Incomplete or invalid chunked upload")
            return AResult(code=AResultCode.BAD_REQUEST, message="Incomplete upload")
        os.makedirs(name=os.path.dirname(output), exist_ok=True)

        def append(source: str):
            with open(file=source, mode="rb") as src, open(
                file=output, mode="ab"
            ) as dst:
                while block := src.read(CHUNK_SIZE):
                    dst.write(block)

        with open(file=output, mode="wb"):
            pass
        try:
            for i in range(total):
                local = await Storage.materialize_async(
                    storage_object=parts[f"chunks/{i}"]
                )
                if local.is_not_ok():
                    logger.error(local.info())
                    return AResult(code=local.code(), message=local.message())
                try:
                    await asyncio.to_thread(append, source=local.result())
                finally:
                    os.unlink(local.result())
            return AResult(code=AResultCode.OK, message="OK", result=output)
        except Exception:
            logger.exception("Could not assemble upload")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Could not assemble upload"
            )
