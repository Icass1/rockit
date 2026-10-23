import os
from logging import Logger
from typing import Any, List

from sqlalchemy import select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import MEDIA_PATH, IMAGES_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.providerStorage import provider_storage
from backend.core.access.db.ormModels.image import ImageRow
from backend.zipExport.models.exportFile import AudioTags, ExportFile

from backend.core.enums.mediaTypeEnum import MediaTypeEnum

logger: Logger = getLogger(name=__name__)


class DownloadZipAccess:
    @staticmethod
    @safe_async
    async def get_container_public_ids_async(
        session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[str]]:
        """Return the subset of public IDs that are albums or playlists."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        result = await session.execute(
            select(CoreMediaRow.public_id).where(
                CoreMediaRow.public_id.in_(public_ids),
                CoreMediaRow.media_type_key.in_(
                    [MediaTypeEnum.ALBUM.value, MediaTypeEnum.PLAYLIST.value]
                ),
            )
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[public_id for (public_id,) in result.all()],
        )

    @staticmethod
    @safe_async
    async def get_export_files_async(
        session: AsyncSession, public_ids: List[str]
    ) -> AResult[list[ExportFile]]:
        """Resolve files and provider-owned audio tags with a fixed query count."""
        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        media_ids = list(
            (
                await session.execute(
                    select(CoreMediaRow.id).where(
                        CoreMediaRow.public_id.in_(public_ids)
                    )
                )
            ).scalars()
        )
        if not media_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])
        files = provider_storage.files()
        statements = [
            source.audio_tags_statement(media_ids)
            for source in provider_storage.sources.values()
            if source.audio_tags_statement is not None
        ]
        # Sources without audio tags (including videos) still export unchanged.
        tags = union_all(*statements).subquery("audio_tags") if statements else None
        columns: list[Any] = [files.c.name, files.c.path, CoreMediaRow.public_id]
        source = files.join(CoreMediaRow, CoreMediaRow.id == files.c.id)
        if tags is not None:
            source = source.outerjoin(tags, tags.c.id == files.c.id).outerjoin(
                ImageRow, ImageRow.id == tags.c.image_id
            )
            columns.extend([tags, ImageRow.path.label("cover_path")])
        rows = await session.execute(
            select(*columns)
            .select_from(source)
            .where(files.c.id.in_(media_ids), files.c.path.isnot(None))
        )
        exported: dict[str, ExportFile] = {}
        for row in rows.mappings():
            path = row["path"]
            path = path if os.path.isabs(path) else os.path.join(MEDIA_PATH, path)
            metadata = None
            if tags is not None and row["id"] is not None:
                cover = row["cover_path"] or ""
                metadata = AudioTags(
                    artists=tuple(row["artists"] or ()),
                    album=row["album"] or "",
                    album_artists=tuple(row["album_artists"] or ()),
                    date=row["date"] or "",
                    track=row["track"] or 0,
                    disc=row["disc"] or 0,
                    isrc=row["isrc"] or "",
                    cover_path=os.path.join(IMAGES_PATH, cover) if cover else "",
                )
            exported[row["public_id"]] = ExportFile(
                name=row["name"], path=path, tags=metadata
            )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                exported[key] for key in dict.fromkeys(public_ids) if key in exported
            ],
        )
