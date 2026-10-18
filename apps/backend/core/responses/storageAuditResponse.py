from pydantic import BaseModel


class StorageAuditResponse(BaseModel):
    registeredCount: int
    missingKeys: list[str]
    unregisteredKeys: list[str]
    sizeMismatchKeys: list[str]
    unreferencedPublicIds: list[str]
