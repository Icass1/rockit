from dataclasses import dataclass
import os
from typing import List

skip_files: List[str] = ["declarativeMixin.py",
                         "addInit.py"]

path: str = os.path.dirname(__file__)

list_dir: List[str] = os.listdir(path)
list_dir.sort()


@dataclass
class Parameter:
    name: str
    type: str
    nullable: bool
    optional: bool
    default_value: str | None


for k in list_dir:
    if not k.endswith(".py"):
        print("Skipping", k)
        continue

    if k in skip_files:
        print("Skipping", k)
        continue

    file_path = os.path.join(path, k)
    print(file_path)

    with open(file_path, "r") as f:
        content: List[str] = f.readlines()

    content_without_init: List[str] = []

    for k in content:
        if "def __init__" in k:
            break
        content_without_init.append(k)

    content = content_without_init

    parameters: List[Parameter] = []

    for index, line in enumerate(content):
        line: str = line.replace("\n", "").replace(" ", "")
        if not "mapped_column" in line:
            continue

        if "import" in line:
            continue

        nullable = True
        optional = False

        default_value = None

        i = 1
        while not line.endswith(")"):
            line += content[index+i].replace("\n", "").replace(" ", "")
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
        type = line.split("[")[1].split("]")[0]

        parameters.append(Parameter(name=name, type=type,
                                    optional=optional, nullable=nullable, default_value=default_value))

    init_stmt = "\n"
    init_stmt = "    def __init__(self"

    sort_parameters: List[Parameter] = []

    for k in parameters:
        if not ((not k.default_value and k.nullable) or k.default_value):
            sort_parameters.append(k)

    for k in parameters:
        if (not k.default_value and k.nullable) or k.default_value:
            sort_parameters.append(k)

    for k in sort_parameters:
        init_stmt += ", "

        init_stmt += f"{k.name}: {k.type}"

        if k.default_value:
            init_stmt += f"={k.default_value}"
        elif k.nullable:
            init_stmt += "=None"

    init_stmt += "):\n"
    init_stmt += "        kwargs={}\n"

    for k in sort_parameters:
        init_stmt += f"        kwargs['{k.name}']={k.name}\n"

    init_stmt += "        for k, v in kwargs.items():\n"
    init_stmt += "            setattr(self, k, v)"
    init_stmt += "\n"

    init_stmt = init_stmt.replace("|", " | ")
    init_stmt = init_stmt.replace("=", " = ")

    with open(file_path, "w") as f:
        f.writelines(content)
        f.write(init_stmt)
