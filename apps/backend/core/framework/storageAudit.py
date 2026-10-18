import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from backend import constants
from backend.core.aResult import AResult, AResultCode
from backend.core.access.objectStore import get_s3_client
from backend.core.access.storageAuditAccess import StorageAuditAccess
from backend.core.responses.storageAuditResponse import StorageAuditResponse
from backend.utils.logger import getLogger

logger = getLogger(__name__)


def _inventory() -> dict[str, int]:
    contents: dict[str, int] = {}
    for page in (
        get_s3_client()
        .get_paginator("list_objects_v2")
        .paginate(Bucket=constants.S3_BUCKET)
    ):
        for obj in page.get("Contents", []):
            key = obj.get("Key")
            if key is not None:
                contents[key] = obj.get("Size", 0)
    return contents


class StorageAudit:
    @staticmethod
    async def inspect_async(session: AsyncSession) -> AResult[StorageAuditResponse]:
        """Report reconciliation needs without changing metadata or deleting objects."""
        found = await StorageAuditAccess.inspect_async(
            session=session, bucket=constants.S3_BUCKET
        )
        if found.is_not_ok():
            logger.error(found.info())
            return AResult(code=found.code(), message=found.message())
        try:
            remote = await asyncio.to_thread(_inventory)
            rows, referenced = found.result()
            registered = {row.key for row in rows}
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=StorageAuditResponse(
                    registeredCount=len(rows),
                    missingKeys=sorted(registered - remote.keys()),
                    unregisteredKeys=sorted(remote.keys() - registered),
                    sizeMismatchKeys=sorted(
                        row.key
                        for row in rows
                        if row.key in remote and row.size_bytes != remote[row.key]
                    ),
                    unreferencedPublicIds=sorted(
                        row.public_id for row in rows if row.id not in referenced
                    ),
                ),
            )
        except Exception:
            logger.exception("Could not audit object storage")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Could not audit object storage"
            )
