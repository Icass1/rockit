import os
import re
import tempfile
import zipfile
from logging import Logger
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import TEMP_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.framework.downloader.downloader import Downloader

from backend.zip.access.downloadZipAccess import DownloadZipAccess

logger: Logger = getLogger(__name__)


def _safe_name(value: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "_", value).strip() or "media"


class DownloadZip:
    @staticmethod
    async def create_async(
        session: AsyncSession,
        user_id: int,
        public_ids: List[str],
        title: str,
    ) -> AResult[str]:
        """Expand containers, package downloaded files and return a temporary ZIP path."""
        expanded_ids: List[str] = []
        for public_id in public_ids:
            media_result = await Downloader.expand_container_async(
                session=session, public_id=public_id, user_id=user_id
            )
            if media_result.is_ok():
                expanded_ids.extend(media_result.result())
            else:
                expanded_ids.append(public_id)

        files_result = await DownloadZipAccess.get_file_paths_async(
            session=session, public_ids=list(dict.fromkeys(expanded_ids))
        )
        if files_result.is_not_ok():
            return AResult(code=files_result.code(), message=files_result.message())
        if not files_result.result():
            return AResult(
                code=AResultCode.NOT_FOUND, message="No downloaded files found"
            )

        os.makedirs(TEMP_PATH, exist_ok=True)
        fd, zip_path = tempfile.mkstemp(prefix="rockit-", suffix=".zip", dir=TEMP_PATH)
        os.close(fd)
        used_names: set[str] = set()
        with zipfile.ZipFile(
            zip_path, "w", compression=zipfile.ZIP_DEFLATED
        ) as archive:
            for name, file_path in files_result.result():
                archive_name = f"{_safe_name(name)}{os.path.splitext(file_path)[1]}"
                suffix = 2
                stem, extension = os.path.splitext(archive_name)
                while archive_name in used_names:
                    archive_name = f"{stem} ({suffix}){extension}"
                    suffix += 1
                used_names.add(archive_name)
                archive.write(file_path, archive_name)

        return AResult(code=AResultCode.OK, message="OK", result=zip_path)
