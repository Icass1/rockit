import asyncio
from pathlib import Path

from backend.constants import MEDIA_PATH
from backend.core.framework.models.downloadCandidate import DownloadCandidate


class DownloadFiles:
    @staticmethod
    async def existing_ids_async(candidates: list[DownloadCandidate]) -> set[int]:
        """Reuse only a real, nonempty file inside the configured media directory."""

        def scan() -> set[int]:
            root = Path(MEDIA_PATH).resolve()
            existing: set[int] = set()
            for candidate in candidates:
                if not candidate.path:
                    continue
                try:
                    path = (root / candidate.path).resolve()
                    if (
                        path.is_relative_to(root)
                        and path.is_file()
                        and path.stat().st_size > 0
                    ):
                        existing.add(candidate.id)
                except (OSError, ValueError):
                    # Missing, unreadable or invalid paths must never appear completed.
                    continue
            return existing

        return await asyncio.to_thread(scan)
