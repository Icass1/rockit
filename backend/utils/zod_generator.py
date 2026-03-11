import os
import re
import types
import inspect
import datetime
import importlib
from pathlib import Path
from collections.abc import Sequence as ABCSequence
from typing import Union, get_args, get_origin, Literal, Optional, Sequence, List, Dict

from pydantic import BaseModel

from backend.utils.backendUtils import time_it
from backend.utils.logger import getLogger

logger = getLogger(__name__)


@time_it
def _format_with_prettier(content: str) -> str | None:
    try:
        import subprocess

        result = subprocess.run(
            ["prettier", "--stdin-filepath", "dummy.ts"],
            input=content,
            capture_output=True,
            text=True,
            cwd="frontend",
        )
        if result.returncode == 0:
            return result.stdout
        logger.warning(f"Prettier failed: {result.stderr}")
        return None
    except Exception as e:
        logger.warning(f"Could not run prettier: {e}")
        return None


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


def get_base_models_from_folder(folder: str) -> list[type[BaseModel]]:
    base_models: list[type[BaseModel]] = []
    folder_path = BASE_DIR / folder

    if not folder_path.exists():
        return base_models

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

    return base_models


def convert_type_to_zod(
    field_type: type,
    known_types: dict[str, str],
    current_file: str,
    schema_refs: set[str],
) -> str:
    origin = get_origin(field_type)
    args = get_args(field_type)

    if origin is None:
        if field_type in PYTHON_TYPE_TO_ZOD:
            return PYTHON_TYPE_TO_ZOD[field_type]
        if field_type.__name__ in known_types:
            target_file = known_types[field_type.__name__]
            if target_file != current_file:
                schema_refs.add(target_file)
            return f"z.lazy(() => {field_type.__name__}Schema)"
        return "z.any()"

    if origin is list or origin is Sequence or origin is ABCSequence:
        if args:
            inner_type = convert_type_to_zod(
                args[0], known_types, current_file, schema_refs
            )
            return f"z.array({inner_type})"
        return "z.array(z.any())"

    if origin is Optional:
        if args:
            inner = convert_type_to_zod(args[0], known_types, current_file, schema_refs)
            return f"{inner}.nullable()"
        return "z.string().nullable()"

    if origin is Literal:
        if args:
            literal_parts = [f'z.literal("{arg}")' for arg in args]
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
                        non_none_args[0], known_types, current_file, schema_refs
                    )
                    + ".nullable()"
                )
            if len(non_none_args) > 1:
                union_parts = [
                    convert_type_to_zod(arg, known_types, current_file, schema_refs)
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
                args[0], known_types, current_file, schema_refs
            )
            value_type = convert_type_to_zod(
                args[1], known_types, current_file, schema_refs
            )
            return f"z.record({key_type}, {value_type})"
        return "z.record(z.string(), z.any())"

    return "z.any()"


def generate_zod_schema(
    model: type[BaseModel],
    known_types: dict[str, str],
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
            field_type, known_types, current_file, schema_refs
        )
        fields[field_name] = zod_type

    if not fields:
        return (f"export const {class_name}Schema = z.any();\n", schema_refs)

    lines.append(f"export const {class_name}Schema = z.object({{")
    for field_name, zod_type in fields.items():
        lines.append(f"    {field_name}: {zod_type},")
    lines.append("});")

    lines.append(f"\nexport type {class_name} = z.infer<typeof {class_name}Schema>;")

    return ("\n".join(lines), schema_refs)


async def generate_zod_schemas() -> None:
    all_models: dict[str, type[BaseModel]] = {}

    for folder in folders_to_process:
        if not os.path.exists(folder):
            logger.warning(f"Folder {folder} does not exist")
            continue

        models = get_base_models_from_folder(folder)
        for model in models:
            if model.__name__ not in all_models:
                all_models[model.__name__] = model

    logger.info(f"Found {len(all_models)} BaseModel classes")

    known_types: dict[str, str] = {}
    for model_name in all_models:
        file_name = to_camel_case(model_name)
        known_types[model_name] = file_name

    output_dir = BASE_DIR / "frontend" / "dto"
    output_dir.mkdir(parents=True, exist_ok=True)

    type_name_to_file: dict[str, str] = {v: k for k, v in known_types.items()}

    pending_files: dict[Path, str] = {}

    for model_name, model in all_models.items():
        file_name = to_camel_case(model_name)
        schema, refs = generate_zod_schema(model, known_types, file_name)

        import_lines: list[str] = ['import { z } from "zod";']

        for ref_file in refs:
            if ref_file != file_name:
                type_name = type_name_to_file.get(ref_file, "")
                if type_name:
                    import_lines.append(f"import {{ {type_name}Schema }} from '@/dto';")

        output_lines = import_lines + ["", schema]
        output_content = "\n".join(output_lines)

        output_path = output_dir / f"{file_name}.ts"

        existing_content: str | None = None
        if output_path.exists():
            existing_content = output_path.read_text()

        if output_content != existing_content:
            pending_files[output_path] = output_content

    # for output_path, output_content in pending_files.items():
    #     formatted_content = _format_with_prettier(output_content)
    #     if formatted_content is None:
    #         formatted_content = output_content
    #         logger.warning(f"Could not format {output_path.name}, writing unformatted")
    #     output_path.write_text(formatted_content)
    #     logger.info(f"Written {output_path}")

    index_lines: list[str] = []
    sorted_models: list[str] = sorted(all_models.keys())
    for model_name in sorted_models:
        file_name = to_camel_case(model_name)
        index_lines.append(
            f"export {{ {model_name}Schema, type {model_name} }} from '@/dto/{file_name}';"
        )

    index_content = "\n".join(index_lines)
    index_path = output_dir / "index.ts"
    existing_index = index_path.read_text() if index_path.exists() else None

    if index_content != existing_index:
        formatted_index = _format_with_prettier(index_content)
        if formatted_index is None:
            formatted_index = index_content
        index_path.write_text(formatted_index)
        logger.info(f"Written index.ts")

    generated_file_names: set[str] = {to_camel_case(m) for m in all_models}
    for existing_file in output_dir.glob("*.ts"):
        if existing_file.name == "index.ts":
            continue
        file_stem = existing_file.stem
        if file_stem not in generated_file_names:
            existing_file.unlink()
            logger.info(f"Deleted {existing_file}")
