import asyncio

from core.framework.models.downloadCandidate import DownloadCandidate
from core.framework.objectFiles import ObjectFiles


class DownloadFiles:
    @staticmethod
    async def existing_ids_async(candidates: list[DownloadCandidate]) -> set[int]:
        """Only reuse nonempty S3 objects; database keys alone do not imply completion."""
        semaphore = asyncio.Semaphore(16)

        async def exists(candidate: DownloadCandidate) -> int | None:
            async with semaphore:
                if candidate.path and await ObjectFiles.exists_async(candidate.path):
                    return candidate.id
            return None

        ids = await asyncio.gather(*(exists(candidate) for candidate in candidates))
        return {value for value in ids if value is not None}
