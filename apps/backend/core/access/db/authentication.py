"""AWS IAM authentication for PostgreSQL connections."""

from collections.abc import Callable
from typing import Any, Protocol, cast

import boto3


class _RdsClient(Protocol):
    """Describe the RDS operation used without requiring optional RDS stubs."""

    def generate_db_auth_token(
        self, *, DBHostname: str, Port: int, DBUsername: str, Region: str
    ) -> str:
        """Sign a database authentication token using the AWS credential chain."""
        ...


def generate_iam_token(host: str, port: int, username: str, region: str) -> str:
    """Create a fresh token with AWS credentials independent of S3 settings."""

    boto3_module: Any = boto3
    client_factory = cast(Callable[..., _RdsClient], boto3_module.client)
    client = client_factory("rds", region_name=region)
    return client.generate_db_auth_token(
        DBHostname=host, Port=port, DBUsername=username, Region=region
    )
