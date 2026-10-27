"""In-memory S3 boundary for service-free storage and media regression tests."""

import hashlib
import io
from pathlib import Path
from typing import Any, BinaryIO

from botocore.exceptions import ClientError


class FakeObjectStore:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.reads: list[str] = []

    def head_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")
        return {
            "ContentLength": len(self.objects[Key]),
            "ETag": hashlib.sha256(self.objects[Key]).hexdigest(),
        }

    def get_object(self, *, Bucket: str, Key: str, Range: str | None = None) -> dict[str, Any]:
        self.reads.append(Key)
        data = self.objects[Key]
        if Range:
            start, end = Range.removeprefix("bytes=").split("-")
            data = data[int(start) : int(end) + 1]
        return {"Body": io.BytesIO(data)}

    def upload_file(
        self, Filename: str, Bucket: str, Key: str, ExtraArgs: dict[str, str] | None = None
    ) -> None:
        self.objects[Key] = Path(Filename).read_bytes()

    def download_file(self, Bucket: str, Key: str, Filename: str) -> None:
        if Key not in self.objects:
            raise FileNotFoundError(Key)
        Path(Filename).write_bytes(self.objects[Key])

    def download_fileobj(self, Bucket: str, Key: str, Fileobj: BinaryIO) -> None:
        if Key not in self.objects:
            raise FileNotFoundError(Key)
        Fileobj.write(self.objects[Key])

    def delete_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        self.objects.pop(Key, None)
        return {}

    def copy_object(self, *, Bucket: str, Key: str, CopySource: dict[str, str]) -> dict[str, str]:
        self.objects[Key] = self.objects[CopySource["Key"]]
        return {}
