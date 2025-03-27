import json
import re
import os

def camel_to_snake(name):
    """Convert camelCase or PascalCase to snake_case."""
    return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()

def to_pascal_case(name):
    # Replace underscores with spaces, then capitalize each word and join them together
    # For camelCase, insert a space before any uppercase letter, then split, capitalize, and join
    name = re.sub(r'(_|^)([a-zA-Z])', lambda m: m.group(2).upper(), name)
    return name

def parse_type(key, value, nested_classes_dict):
    """Determine the type of the value for type hints."""
    if isinstance(value, str):
        return "str"
    elif isinstance(value, bool):
        return "bool"
    elif isinstance(value, int):
        return "int"
    elif isinstance(value, float):
        return "float"
    elif isinstance(value, list):
        if value:
            list_type = parse_type(key, value[0], nested_classes_dict)
            return f"List[{list_type}]"
        else:
            return "List[Any]"
    elif isinstance(value, dict):
        if key in nested_classes_dict:
            return nested_classes_dict[key]
        return "dict"
    return "Any"

def generate_class(name, json_data, nested_classes_dict):
    """Generate a class definition for a given dictionary."""
    class_def = [f"class {name}:"]

    items = json_data.items()

    for key, value in items:
        var_name = key
        var_type = parse_type(key, value, nested_classes_dict)
        class_def.append(f"    {var_name}: {var_type}")
    class_def.append(f"    _json: dict")

    class_def.append(f"    def from_dict(obj: Any) -> '{name}':")
    for key, value in items:
        var_name = key
        var_type = parse_type(key, value, nested_classes_dict)
        if "List" in var_type and var_name in nested_classes_dict:
            class_def.append(f"        _{var_name} = [{nested_classes_dict[var_name]}.from_dict(k) for k in obj.get('{key}')] if obj and '{key}' in obj else None")
        elif var_name in nested_classes_dict:
            class_def.append(f"        _{var_name} = {nested_classes_dict[var_name]}.from_dict(obj.get('{key}')) if obj and '{key}' in obj else None")
        else: class_def.append(f"        _{var_name} = obj.get('{key}') if obj and '{key}' in obj else None")

    class_def.append(f"        return {name}({', '.join([f'_{var_name}' for var_name in json_data.keys()] + ['obj'])})")

    if len(items) > 0:
        class_def.append(f"    def __getitem__(self, item):")
        first = True
        for key, value in list(items):
            class_def.append(f"        {'' if first else 'el'}if item == '{key}':")
            class_def.append(f"            return self.{key}")
            first = False
        class_def.append(f"        return None")

    return "\n".join(class_def)

nested_class_names = []

def generate_classes(name, json_data, classes, base_name):
    """Recursively generate class definitions for nested JSON."""

    if isinstance(json_data, dict):

        nested_classes_dict = {}

        for key, value in json_data.items():

            if isinstance(value, dict):
                nested_class_name = base_name + to_pascal_case(key)
                index = 1
                # print("1",nested_class_name, nested_class_names)
                while nested_class_name in nested_class_names:
                    nested_class_name = base_name + to_pascal_case(key) + str(index)
                    index += 1

                generate_classes(nested_class_name, value, classes, base_name=base_name)
                nested_class_names.append(nested_class_name)
                nested_classes_dict[key] = nested_class_name

            elif isinstance(value, list) and value and isinstance(value[0], dict):
                nested_class_name = base_name + to_pascal_case(key)

                index = 1
                while nested_class_name in nested_class_names:
                    nested_class_name = base_name + to_pascal_case(key) + str(index)
                    index += 1

                # print("2",nested_class_name, nested_class_names)
                generate_classes(nested_class_name, value[0], classes, base_name=base_name)

                nested_class_names.append(nested_class_name)
                nested_classes_dict[key] = nested_class_name

        class_def = generate_class(name, json_data, nested_classes_dict)
        classes.append(class_def)

def main():
    with open('backend/json.json', 'r') as f:
        json_data = json.load(f)

    classes = []
    dir_name = "rockItApiTypes"
    base_name = "RockItSong"
    root_name = "RawRockItApiSong"
    generate_classes(name=root_name, json_data=json_data, classes=classes, base_name=base_name)

    if not os.path.exists(f"backend/{dir_name}"):
        os.mkdir(f"backend/{dir_name}")

    with open(f"backend/{dir_name}/{root_name}.py", "w") as f:
        f.write("from typing import List, Any\n")
        f.write("from dataclasses import dataclass\n")
        f.write("\n")
        for class_def in classes:
            f.write("@dataclass")
            f.write("\n")
            f.write(class_def)
            f.write("\n")
            f.write("\n")

if __name__ == "__main__":
    main()
