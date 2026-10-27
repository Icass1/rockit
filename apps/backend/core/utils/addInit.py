import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from logger import logger

BACKEND_ROOT = Path(__file__).resolve().parents[2]

skip_files: list[str] = [
    "__init__.py",
    "declarativeMixin.py",
]


@dataclass
class Parameter:
    name: str
    type: str
    nullable: bool
    optional: bool
    default_value: str | None


def format_with_ruff(content: str, file_path: str) -> str:
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "ruff",
            "format",
            "--config",
            str(BACKEND_ROOT / "pyproject.toml"),
            "--stdin-filename",
            file_path,
            "-",
        ],
        input=content,
        capture_output=True,
        check=True,
        cwd=BACKEND_ROOT,
        text=True,
    )
    return result.stdout


def add_init_to_orm() -> None:
    for dirpath, _, filenames in os.walk(BACKEND_ROOT):
        dirpath = dirpath.replace("./", "")

        dirpaths = dirpath.split("/")

        if dirpaths[-1] != "ormModels" and dirpaths[-1] != "ormEnums":
            continue

        for filename in filenames:
            k = os.path.join(dirpath, filename)

            if not k.endswith(".py"):
                logger.debug(f"Skipping {k}")
                continue

            if filename in skip_files:
                logger.debug(f"Skipping {k}")
                continue

            file_path = k

            with open(file_path) as f:
                initial_content: list[str] = f.readlines()

            content_without_init: list[str] = []

            parameters: list[Parameter] = []

            after_class_definition = False

            for k in initial_content:
                if k.startswith("class "):
                    after_class_definition = True

                if after_class_definition:
                    if "TablePublicId" in k:
                        parameters.append(
                            Parameter(
                                name="public_id",
                                nullable=True,
                                optional=True,
                                type="str | None",
                                default_value=None,
                            )
                        )

                    if "TableAutoincrementKey" in k:
                        parameters.append(
                            Parameter(
                                name="key",
                                nullable=False,
                                optional=False,
                                type="int",
                                default_value=None,
                            )
                        )

                if "def __init__" in k:
                    break
                content_without_init.append(k)

            content: list[str] = content_without_init

            for index, line in enumerate(content):
                line: str = line.replace("\n", "").replace("    ", "")
                if "mapped_column" not in line:
                    continue

                if "import" in line:
                    continue

                nullable = True
                optional = False

                default_value = None

                i = 1
                while not line.endswith(")"):
                    line += content[index + i].replace("\n", "").replace("    ", "")
                    i += 1

                if "nullable=False" in line:
                    nullable = False
                if not nullable and "default=" in line:
                    default_value = ""
                    for k in line.split("default=")[1]:
                        if k == ")" or k == ",":
                            break
                        default_value += k
                    optional = True
                if "primary_key=True" in line:
                    nullable = False
                    optional = False

                name = line.split(":")[0]

                type = ""

                bracket_count = 0

                for char in line:
                    if char == "]":
                        bracket_count -= 1

                    if bracket_count > 0:
                        type += char

                    if char == "[":
                        bracket_count += 1

                parameters.append(
                    Parameter(
                        name=name,
                        type=type,
                        optional=optional,
                        nullable=nullable,
                        default_value=default_value,
                    )
                )

            if len(parameters) == 0:
                logger.debug(f"{file_path} has no parameters.")
                continue

            init_stmt = "\n"
            init_stmt = "    def __init__(self"

            if not any(
                parameter.name == "id" for parameter in parameters
            ) and "TableAutoincrementId" in "".join(content):
                parameters.append(
                    Parameter(
                        name="id",
                        type="int | None",
                        nullable=True,
                        optional=True,
                        default_value=None,
                    )
                )

            sort_parameters: list[Parameter] = []

            for k in parameters:
                k_types = k.type.replace(" ", "").split("|")
                if not (
                    (not k.default_value and k.nullable and "None" in k_types) or k.default_value
                ):
                    sort_parameters.append(k)

            for k in parameters:
                k_types = k.type.replace(" ", "").split("|")
                if (not k.default_value and k.nullable and "None" in k_types) or k.default_value:
                    sort_parameters.append(k)

            types_set: set[str] = set()

            for k in sort_parameters:
                init_stmt += ", "

                k_types = k.type.replace(" ", "").split("|")

                for k_type in k_types:
                    types_set.add(k_type.replace(",", ", "))

                parameter_type = f"{k.type} | None" if k.default_value == "dict" else k.type
                init_stmt += f"{k.name}: {parameter_type}"

                if k.default_value == "dict":
                    init_stmt += "=None"
                elif k.default_value:
                    init_stmt += f"={k.default_value}"
                elif k.nullable and "None" in types_set:
                    init_stmt += "=None"

            types_list = list(types_set)
            types_list.sort()

            init_stmt += ") -> None:\n"
            init_stmt += "        kwargs: dict[str, " + " | ".join(types_list) + "]={}\n"

            for k in sort_parameters:
                if k.name in ("id", "public_id") and k.nullable:
                    init_stmt += f"        if {k.name} is not None:\n"
                    init_stmt += f"            kwargs['{k.name}']={k.name}\n"
                elif k.default_value == "dict":
                    init_stmt += f"        if {k.name} is not None:\n"
                    init_stmt += f"            kwargs['{k.name}']={k.name}\n"
                else:
                    init_stmt += f"        kwargs['{k.name}']={k.name}\n"

            init_stmt += "        for k, v in kwargs.items():\n"
            init_stmt += "            setattr(self, k, v)"
            init_stmt += "\n"

            # init_stmt = init_stmt.replace("|", " | ")
            init_stmt: str = init_stmt.replace("=", " = ")

            output_content: str = format_with_ruff("".join(content) + init_stmt, file_path)

            if output_content == "".join(initial_content):
                continue

            logger.info(f"Updating contents of {file_path}")

            with open(file_path, "w") as f:
                f.write(output_content)


if __name__ == "__main__":
    add_init_to_orm()
