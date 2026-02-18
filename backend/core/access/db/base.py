from sqlalchemy import MetaData
from sqlalchemy.orm import declarative_base

global_metadata = MetaData(schema=None)


CoreBase = declarative_base(metadata=global_metadata)
CoreBase.metadata.schema = "main"