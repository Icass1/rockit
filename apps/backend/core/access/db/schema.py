"""Database schema discovery and shared schema constants."""

import os
from dataclasses import dataclass
from importlib import util as importlib_util
from pathlib import Path
from typing import Any

from backend.utils.logger import getLogger

logger = getLogger(__name__)


@dataclass
class SchemaInfo:
    """Describe a database schema declared by a database module."""

    name: str
    base: Any


schemas: list[SchemaInfo] = []
modules: list[tuple[str, Path]] = []
BACKEND_ROOT = Path(__file__).resolve().parents[3]

for dirpath, dirnames, filenames in os.walk(BACKEND_ROOT):
    if not dirpath.endswith("/db"):
        continue

    if ".git" in dirpath:
        continue

    if "db.py" not in filenames:
        logger.warning(f"db.py not found inside db folder in {dirpath}")
        continue

    base = ".".join(Path(dirpath).relative_to(BACKEND_ROOT).parts)
    module = f"backend.{base}.db"
    modules.append((module, Path(dirpath) / "db.py"))

modules_sorted: list[tuple[str, Path]] = sorted(
    modules,
    key=lambda x: (0 if "core" in x[0] else 1, x[0]),
)

for module_name, db_file in modules_sorted:
    logger.info(f"Importing module {module_name} from {db_file}")
    spec = importlib_util.spec_from_file_location(module_name, db_file)
    if not spec:
        continue

    module = importlib_util.module_from_spec(spec)

    if not spec.loader:
        continue
    spec.loader.exec_module(module)

    try:
        for schema in module.schemas:
            schemas.append(SchemaInfo(name=schema, base=module.base))
    except Exception:
        logger.exception(msg=f"{module_name} doesn't have an schemas variable declared")


SET_UPDATED_TIMESTAMP_STMT = """
CREATE OR REPLACE FUNCTION core.set_updated_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""
