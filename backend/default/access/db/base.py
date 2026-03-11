from sqlalchemy.orm import declarative_base

from backend.core.access.db.base import global_metadata

DefaultBase = declarative_base(metadata=global_metadata)
DefaultBase.metadata.schema = "default_schema"
