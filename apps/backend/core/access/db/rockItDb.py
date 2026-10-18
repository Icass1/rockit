"""Compatibility exports for Rockit domain modules."""

from backend.core.access.db.database import (
    Database,
    ResilientAsyncSession,
    SchemaInfo,
    schemas,
)

RockItDB = Database
__all__ = ["RockItDB", "ResilientAsyncSession", "SchemaInfo", "schemas"]
