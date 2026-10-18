from typing import TYPE_CHECKING, Any, Callable, cast

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client
"""S3 transport. Blocking calls are invoked through asyncio.to_thread by the framework."""

from functools import lru_cache
import boto3
from botocore.config import Config
from backend import constants


@lru_cache(maxsize=2)
def get_s3_client(public: bool = False) -> "S3Client":
    endpoint = (
        (constants.S3_PUBLIC_ENDPOINT_URL or constants.S3_PRIVATE_ENDPOINT_URL)
        if public
        else constants.S3_PRIVATE_ENDPOINT_URL
    )
    factory = cast(Callable[..., "S3Client"], cast(Any, boto3).client)
    return factory(
        service_name="s3",
        endpoint_url=endpoint,
        region_name=constants.S3_REGION,
        aws_access_key_id=constants.S3_ACCESS_KEY or None,
        aws_secret_access_key=constants.S3_SECRET_KEY or None,
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=10,
            read_timeout=60,
            s3={"addressing_style": "path" if endpoint else "virtual"},
        ),
    )
