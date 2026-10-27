"""Provider file projections resolve normalized storage-object references."""

from sqlalchemy import Table, select
from sqlalchemy.sql.selectable import ScalarSelect

from core.access.db.ormModels.storageObject import StorageObjectRow


def file_key_column(table: Table) -> ScalarSelect[str]:
    return (
        select(StorageObjectRow.key)
        .where(StorageObjectRow.id == table.c.storage_object_id)
        .correlate(table)
        .scalar_subquery()
    )
