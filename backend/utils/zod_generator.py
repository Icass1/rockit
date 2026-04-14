import os
import re
import types
import inspect
import datetime
import importlib
from enum import Enum
from pathlib import Path
from collections.abc import Sequence as ABCSequence
from typing import Union, get_args, get_origin, Literal, Optional, Sequence, List, Dict

from pydantic import BaseModel

from backend.utils.logger import getLogger

logger = getLogger(__name__)


folders_to_process: List[str] = []

for root, dirs, files in os.walk("."):
    if "venv" in root:
        continue
    if "node_modules" in root:
        continue
    for dir in dirs:
        if dir.endswith("responses") or dir.endswith("requests"):
            folders_to_process.append(os.path.join(root, dir))


BASE_DIR = Path().cwd()

PYTHON_TYPE_TO_ZOD = {
    str: "z.string()",
    int: "z.number()",
    float: "z.number()",
    bool: "z.boolean()",
    datetime.datetime: "z.iso.datetime()",
    datetime.date: "z.iso.date()",
}


def to_camel_case(name: str) -> str:
    result = re.sub(r"(?<!^)(?=[A-Z])", "", name)
    if result and result[0].isupper():
        result = result[0].lower() + result[1:]
    return result


def get_base_models_from_folder(
    folder: str,
) -> tuple[list[type[BaseModel]], dict[str, type]]:
    base_models: list[type[BaseModel]] = []
    type_aliases: dict[str, type] = {}
    folder_path = BASE_DIR / folder

    if not folder_path.exists():
        return base_models, type_aliases

    for file_path in folder_path.glob("*.py"):
        if file_path.name.startswith("_") or file_path.name == "baseModel.py":
            continue

        module_name = file_path.stem

        try:
            module = importlib.import_module(
                f"backend.{folder.split('backend/')[1].replace('/', '.')}.{module_name}"
            )
        except Exception as e:
            logger.warning(f"Could not import {module_name} from {folder}: {e}")
            continue

        for _name, obj in inspect.getmembers(module, inspect.isclass):
            if issubclass(obj, BaseModel) and obj is not BaseModel:
                if obj.__module__ == module.__name__:
                    base_models.append(obj)

        for _name, obj in module.__dict__.items():
            if _name.startswith("_"):
                continue
            if hasattr(obj, "__origin__") and _name[0].isupper():
                type_aliases[_name] = obj

    return base_models, type_aliases


def _parse_type_from_repr(
    type_repr: str, known_types: dict[str, type]
) -> tuple[str, list[type]] | None:
    """Parse a type from its repr string like '<class '...PlaylistResponseItem[BaseSongWithAlbumResponse]'>'."""
    match = re.match(r"^<class '(.+)'>$", type_repr)
    if match:
        type_repr = match.group(1)
    match = re.match(r"^([\w.]+)\[([\w,.\s]+)\]$", type_repr)
    if not match:
        return None
    full_base_name = match.group(1)
    base_name = full_base_name.split(".")[-1]
    if base_name not in known_types:
        return None
    args_str = match.group(2)
    type_args: List[type] = []
    for part in args_str.split(","):
        part = part.strip().split(".")[-1]
        if part in known_types:
            type_args.append(known_types[part])
    if type_args:
        return (base_name, type_args)
    return None


def convert_type_to_zod(
    field_type: type,
    known_types: dict[str, str],
    known_type_objects: dict[str, type],
    current_file: str,
    schema_refs: set[str],
) -> str:
    origin = get_origin(field_type)
    args = get_args(field_type)

    if origin is None and inspect.isclass(field_type) and issubclass(field_type, Enum):
        enum_members = list(field_type)
        if enum_members and all(isinstance(m.value, str) for m in enum_members):
            literal_parts = [f'"{m.value}"' for m in enum_members]
            return f"z.enum([{', '.join(literal_parts)}])"
        literal_parts = [f'"{m.name}"' for m in enum_members]
        return f"z.enum([{', '.join(literal_parts)}])"

    if origin is None:
        if field_type in PYTHON_TYPE_TO_ZOD:
            return PYTHON_TYPE_TO_ZOD[field_type]
        if hasattr(field_type, "__name__") and field_type.__name__ in known_types:
            target_file = known_types[field_type.__name__]
            if target_file != current_file:
                schema_refs.add(target_file)
            return f"z.lazy(() => {field_type.__name__}Schema)"
        if hasattr(field_type, "model_fields"):
            parsed = _parse_type_from_repr(repr(field_type), known_type_objects)
            if parsed:
                base_name, type_args = parsed
                target_file = known_types[base_name]
                if target_file != current_file:
                    schema_refs.add(target_file)
                inner_types = [
                    convert_type_to_zod(
                        arg, known_types, known_type_objects, current_file, schema_refs
                    )
                    for arg in type_args
                ]
                inner = ", ".join(inner_types)
                return f"z.lazy(() => {base_name}Schema).unwrap().extend({{ item: z.union([{inner}]) }})"
        return "z.any()"

    if origin is not None and args and hasattr(origin, "__name__"):
        base_name = origin.__name__
        if base_name in known_types and base_name not in ("Sequence", "List"):
            target_file = known_types[base_name]
            if target_file != current_file:
                schema_refs.add(target_file)
            inner_types = [
                convert_type_to_zod(
                    arg, known_types, known_type_objects, current_file, schema_refs
                )
                for arg in args
            ]
            inner = ", ".join(inner_types)
            return f"z.lazy(() => {base_name}Schema).unwrap().extend({{ item: z.union([{inner}]) }})"

    if origin is list or origin is Sequence or origin is ABCSequence:
        if args:
            inner_type = convert_type_to_zod(
                args[0], known_types, known_type_objects, current_file, schema_refs
            )
            return f"z.array({inner_type})"
        return "z.array(z.any())"

    if origin is Optional:
        if args:
            inner = convert_type_to_zod(
                args[0], known_types, known_type_objects, current_file, schema_refs
            )
            return f"{inner}.nullable()"
        return "z.string().nullable()"

    if origin is Literal:
        if args:
            literal_parts: List[str] = []
            for arg in args:
                if isinstance(arg, bool):
                    literal_parts.append(f"z.literal({str(arg).lower()})")
                elif isinstance(arg, str):
                    literal_parts.append(f'z.literal("{arg}")')
                else:
                    literal_parts.append(f"z.literal({arg})")
            return f"z.union([{', '.join(literal_parts)}])"
        return "z.string()"

    is_union = (
        origin is Union
        or origin is types.UnionType
        or (hasattr(origin, "__name__") and origin.__name__ == "Union")
    )
    if is_union:
        if args:
            non_none_args = [arg for arg in args if arg is not type(None)]
            if len(non_none_args) == 1:
                return (
                    convert_type_to_zod(
                        non_none_args[0],
                        known_types,
                        known_type_objects,
                        current_file,
                        schema_refs,
                    )
                    + ".nullable()"
                )
            if len(non_none_args) > 1:
                union_parts = [
                    convert_type_to_zod(
                        arg, known_types, known_type_objects, current_file, schema_refs
                    )
                    for arg in non_none_args
                ]
                is_optional = any(arg is type(None) for arg in args)
                if is_optional:
                    return f"z.union([{', '.join(union_parts)}]).nullable()"
                else:
                    return f"z.union([{', '.join(union_parts)}])"
        return "z.any()"

    if origin is dict or origin is Dict:
        if args:
            key_type = convert_type_to_zod(
                args[0], known_types, known_type_objects, current_file, schema_refs
            )
            value_type = convert_type_to_zod(
                args[1], known_types, known_type_objects, current_file, schema_refs
            )
            return f"z.record({key_type}, {value_type})"
        return "z.record(z.string(), z.any())"

    return "z.any()"


def generate_zod_schema(
    model: type[BaseModel],
    known_types: dict[str, str],
    known_type_objects: dict[str, type],
    current_file: str,
) -> tuple[str, set[str]]:
    lines: list[str] = []
    class_name = model.__name__
    schema_refs: set[str] = set()

    fields: dict[str, str] = {}
    for field_name, field_info in model.model_fields.items():
        field_type: type | None = field_info.annotation
        if field_type is None:
            fields[field_name] = "z.any()"
            continue
        zod_type = convert_type_to_zod(
            field_type, known_types, known_type_objects, current_file, schema_refs
        )
        # Handle default values from Pydantic Field(default_factory=list)
        if field_info.default_factory is not None:
            zod_type = f"{zod_type}.default([])"
        elif field_info.default is not None:
            default_val = field_info.default
            if isinstance(default_val, list):
                zod_type = f"{zod_type}.default([])"
            elif isinstance(default_val, str):
                zod_type = f'{zod_type}.default("{default_val}")'
            elif isinstance(default_val, bool):
                zod_type = f"{zod_type}.default({str(default_val).lower()})"
            elif isinstance(default_val, (int, float)):
                zod_type = f"{zod_type}.default({default_val})"
        fields[field_name] = zod_type

    if not fields:
        return (f"export const {class_name}Schema = z.any();\n", schema_refs)

    lines.append(f"export const {class_name}Schema = z.object({{")
    for field_name, zod_type in fields.items():
        lines.append(f"    {field_name}: {zod_type},")
    lines.append("});")

    lines.append(f"\nexport type {class_name} = z.infer<typeof {class_name}Schema>;")

    return ("\n".join(lines), schema_refs)


def generate_zod_type_alias(
    alias_name: str,
    alias_type: type,
    known_types: dict[str, str],
    known_type_objects: dict[str, type],
    current_file: str,
) -> tuple[str, set[str]]:
    schema_refs: set[str] = set()
    zod_type = convert_type_to_zod(
        alias_type, known_types, known_type_objects, current_file, schema_refs
    )
    lines = [
        f"export const {alias_name}Schema = {zod_type};",
        f"\nexport type {alias_name} = z.infer<typeof {alias_name}Schema>;",
    ]
    return ("\n".join(lines), schema_refs)


async def generate_zod_schemas() -> None:
    all_models: dict[str, type[BaseModel]] = {}
    type_aliases: dict[str, type] = {}

    for folder in folders_to_process:
        if not os.path.exists(folder):
            logger.warning(f"Folder {folder} does not exist")
            continue

        models, aliases = get_base_models_from_folder(folder)
        for model in models:
            if model.__name__ not in all_models:
                all_models[model.__name__] = model
        for alias_name, alias_type in aliases.items():
            if alias_name not in type_aliases:
                type_aliases[alias_name] = alias_type

    logger.info(f"Found {len(all_models)} BaseModel classes")
    logger.info(f"Found {len(type_aliases)} type aliases")

    known_types: dict[str, str] = {}
    known_type_objects: dict[str, type] = {}
    for model_name, model in all_models.items():
        file_name = to_camel_case(model_name)
        known_types[model_name] = file_name
        known_type_objects[model_name] = model
    for alias_name, alias_type in type_aliases.items():
        file_name = to_camel_case(alias_name)
        known_types[alias_name] = file_name
        known_type_objects[alias_name] = alias_type

    output_dir = BASE_DIR / "frontend" / "packages" / "shared" / "src" / "dto"
    output_dir.mkdir(parents=True, exist_ok=True)

    type_name_to_file: dict[str, str] = {v: k for k, v in known_types.items()}

    GENERATED_FILE_HEADER = """// This file is generated using: python3 -m backend zod
// Do not modify this file manually.
"""

    for model_name, model in all_models.items():
        file_name = to_camel_case(model_name)
        schema, refs = generate_zod_schema(
            model, known_types, known_type_objects, file_name
        )

        import_lines: list[str] = ['import { z } from "zod";']
        schema_names_imported: set[str] = set()

        for ref_file in refs:
            if ref_file != file_name:
                type_name = type_name_to_file.get(ref_file, "")
                if type_name:
                    import_lines.append(
                        f"import {{ {type_name}Schema }} from './{ref_file}';"
                    )
                    schema_names_imported.add(type_name)

        output_lines = [GENERATED_FILE_HEADER] + import_lines + ["", schema]

        output_path = output_dir / f"{file_name}.ts"

        output_path.write_text("\n".join(output_lines))
        logger.info(f"Written {output_path}")

    for alias_name, alias_type in type_aliases.items():
        file_name = to_camel_case(alias_name)
        schema, refs = generate_zod_type_alias(
            alias_name, alias_type, known_types, known_type_objects, file_name
        )

        import_lines: list[str] = ['import { z } from "zod";']
        schema_names_imported: set[str] = set()

        for ref_file in refs:
            if ref_file != file_name:
                type_name = type_name_to_file.get(ref_file, "")
                if type_name:
                    import_lines.append(
                        f"import {{ {type_name}Schema }} from './{ref_file}';"
                    )
                    schema_names_imported.add(type_name)

        output_lines = [GENERATED_FILE_HEADER] + import_lines + ["", schema]

        output_path = output_dir / f"{file_name}.ts"

        output_path.write_text("\n".join(output_lines))
        logger.info(f"Written {output_path}")

    # for output_path, output_content in pending_files.items():
    #     formatted_content = _format_with_prettier(output_content)
    #     if formatted_content is None:
    #         formatted_content = output_content
    #         logger.warning(f"Could not format {output_path.name}, writing unformatted")
    #     output_path.write_text(formatted_content)
    #     logger.info(f"Written {output_path}")

    index_lines: list[str] = []
    sorted_models: list[str] = sorted(all_models.keys())
    sorted_aliases: list[str] = sorted(type_aliases.keys())
    for model_name in sorted_models:
        file_name = to_camel_case(model_name)
        index_lines.append(
            f"export {{ {model_name}Schema, type {model_name} }} from './{file_name}';"
        )
    for alias_name in sorted_aliases:
        file_name = to_camel_case(alias_name)
        index_lines.append(
            f"export {{ {alias_name}Schema, type {alias_name} }} from './{file_name}';"
        )

    generated_file_names: set[str] = {to_camel_case(m) for m in all_models}
    generated_file_names.update(to_camel_case(a) for a in type_aliases)
    for existing_file in output_dir.glob("*.ts"):
        if existing_file.name == "index.ts":
            continue
        file_stem = existing_file.stem
        if file_stem not in generated_file_names:
            existing_file.unlink()
            logger.info(f"Deleted {existing_file}")

    (output_dir / "index.ts").write_text(
        GENERATED_FILE_HEADER + "\n" + "\n".join(index_lines)
    )
    logger.info(f"Written index.ts")

    # Execute prettier on the generated files.
    try:
        import subprocess

        subprocess.run(
            ["prettier", "--write", str(output_dir)], cwd="frontend", check=True
        )
        logger.info("Formatted generated files with Prettier")
    except Exception as e:
        logger.warning(f"Could not format files with Prettier: {e}")
