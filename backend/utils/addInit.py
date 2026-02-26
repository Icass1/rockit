import os
import black
from typing import List, Set
from dataclasses import dataclass


from backend.utils.logger import getLogger

logger = getLogger(__name__)

skip_files: List[str] = [
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


def add_init_to_orm():

    for dirpath, _, filenames in os.walk("."):
        dirpath = dirpath.replace("./", "")

        dirpaths = dirpath.split("/")

        if dirpaths[-1] != "ormModels" and dirpaths[-1] != "ormEnums":
            continue

        for filename in filenames:
            k = os.path.join(dirpath, filename)

            if not k.endswith(".py"):
                logger.info(f"Skipping {k}")
                continue

            if filename in skip_files:
                logger.info(f"Skipping {k}")
                continue

            file_path = k

            with open(file_path, "r") as f:
                initial_content: List[str] = f.readlines()

            content_without_init: List[str] = []

            parameters: List[Parameter] = []

            after_class_definition = False

            for k in initial_content:
                if k.startswith("class "):
                    after_class_definition = True

                if after_class_definition:
                    if "TablePublicId" in k:
                        parameters.append(
                            Parameter(
                                name="public_id",
                                nullable=False,
                                optional=False,
                                type="str",
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

            content: List[str] = content_without_init

            for index, line in enumerate(content):
                line: str = line.replace("\n", "").replace("    ", "")
                if not "mapped_column" in line:
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
                logger.info(f"{file_path} has no parameters.")
                continue

            init_stmt = "\n"
            init_stmt = "    def __init__(self"

            sort_parameters: List[Parameter] = []

            for k in parameters:
                if not ((not k.default_value and k.nullable) or k.default_value):
                    sort_parameters.append(k)

            for k in parameters:
                if (not k.default_value and k.nullable) or k.default_value:
                    sort_parameters.append(k)

            types_set: Set[str] = set()

            for k in sort_parameters:
                init_stmt += ", "

                k_types = k.type.replace(" ", "").split("|")

                for k_type in k_types:
                    types_set.add(k_type.replace(",", ", "))

                init_stmt += f"{k.name}: {k.type}"

                if k.default_value:
                    init_stmt += f"={k.default_value}"
                elif k.nullable:
                    init_stmt += "=None"

            types_list = list(types_set)
            types_list.sort()

            init_stmt += "):\n"
            init_stmt += (
                f"        kwargs: Dict[str, " + " | ".join(types_list) + "]={}\n"
            )

            for k in sort_parameters:
                init_stmt += f"        kwargs['{k.name}']={k.name}\n"

            init_stmt += "        for k, v in kwargs.items():\n"
            init_stmt += "            setattr(self, k, v)"
            init_stmt += "\n"

            # init_stmt = init_stmt.replace("|", " | ")
            init_stmt: str = init_stmt.replace("=", " = ")

            output_content: str = black.format_str(
                "".join(content) + init_stmt, mode=black.Mode()
            )

            if output_content == "".join(initial_content):
                continue

            logger.info(f"Updating contents of {file_path}")

            with open(file_path, "w") as f:
                f.write(output_content)


if __name__ == "__main__":
    add_init_to_orm()
