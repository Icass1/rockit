from datetime import datetime

from pydantic import BaseModel

from core.access.db.ormModels.storageObject import StorageObjectRow
from core.framework.storage import Storage


class StorageObjectResponse(BaseModel):
    publicId: str
    url: str | None
    key: str
    originalKey: str | None
    bucket: str
    contentType: str | None
    sizeBytes: int
    etag: str | None
    dateAdded: datetime
    dateUpdated: datetime

    @classmethod
    def from_row(cls, row: StorageObjectRow) -> "StorageObjectResponse":
        return cls(
            publicId=row.public_id,
            url=Storage.get_object_url(row),
            key=row.key,
            originalKey=row.original_key,
            bucket=row.bucket,
            contentType=row.content_type,
            sizeBytes=row.size_bytes,
            etag=row.etag,
            dateAdded=row.date_added,
            dateUpdated=row.date_updated,
        )
