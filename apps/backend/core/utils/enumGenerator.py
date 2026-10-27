import importlib
import inspect
import subprocess
from enum import Enum
from pathlib import Path

from logger import logger


def to_camel_case(name: str) -> str:
    if name and name[0].isupper():
        return name[0].lower() + name[1:]
    return name


GENERATED_FILE_HEADER = """// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.
"""


async def generate_enum_schemas() -> None:
    project_root = Path(__file__).resolve().parents[4]
    enum_folder = project_root / "apps/backend/core/enums"
    if not enum_folder.exists():
        logger.warning(f"Enum folder {enum_folder} does not exist")
        return

    enums: dict[str, type[Enum]] = {}

    for file_path in sorted(enum_folder.glob("*.py")):
        if file_path.name.startswith("_"):
            continue

        module_name = file_path.stem

        try:
            module = importlib.import_module(f"core.enums.{module_name}")
        except Exception as e:
            logger.warning(f"Could not import {module_name} from {enum_folder}: {e}")
            continue

        for _name, obj in inspect.getmembers(module, inspect.isclass):
            if obj is Enum:
                continue
            if issubclass(obj, Enum) and obj.__module__ == module.__name__:
                enums[obj.__name__] = obj

    logger.info(f"Found {len(enums)} enums")

    output_dir = project_root / "packages/shared/src/models/enums"
    output_dir.mkdir(parents=True, exist_ok=True)

    generated_stems: set[str] = set()

    for enum_name, enum_class in sorted(enums.items()):
        lines: list[str] = [
            GENERATED_FILE_HEADER,
            f"export enum {enum_name} {{",
        ]
        for member_name, _member in enum_class.__members__.items():
            lines.append(f'    {member_name} = "{member_name}",')
        lines.append("}")

        file_stem = to_camel_case(enum_name)
        generated_stems.add(file_stem)

        output_path = output_dir / f"{file_stem}.ts"
        output_path.write_text("\n".join(lines) + "\n")
        logger.info(f"Written {output_path}")

    index_lines: list[str] = [GENERATED_FILE_HEADER.rstrip()]
    for enum_name in sorted(enums.keys()):
        file_stem = to_camel_case(enum_name)
        index_lines.append(f"export {{ {enum_name} }} from './{file_stem}';")
    (output_dir / "index.ts").write_text("\n".join(index_lines) + "\n")

    for existing_file in output_dir.glob("*.ts"):
        if existing_file.name == "index.ts":
            continue
        if (
            existing_file.stem not in generated_stems
            and "This file is generated using:" in existing_file.read_text()
        ):
            existing_file.unlink()
            logger.info(f"Deleted {existing_file}")

    try:
        subprocess.run(
            ["pnpm", "exec", "prettier", "--write", str(output_dir)],
            cwd=project_root,
            check=True,
        )
        logger.info("Formatted generated files with Prettier")
    except Exception as e:
        logger.warning(f"Could not format files with Prettier: {e}")
