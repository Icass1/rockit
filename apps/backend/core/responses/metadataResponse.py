from typing import Any

from pydantic import BaseModel


class MetadataResponse(BaseModel):
    """Provider-owned external metadata, independent from playable library media.

    External identifiers are source identifiers, never Core media public IDs.
    Data retains the source's complete JSON structure, including relationships.
    """

    provider: str
    entity: str
    externalId: str | None = None
    data: dict[str, Any]
    cached: bool
    fetchedAt: str
    stale: bool = False
