import json
from typing import List, Dict, Any
import re

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
    # if not json_data:
    #     class_def.append("    pass")
    #     return "\n".join(class_def)

    for key, value in json_data.items():
        var_name = (key)
        var_type = parse_type(key, value, nested_classes_dict)
        class_def.append(f"    {var_name}: {var_type}")

    class_def.append(f"    def from_dict(obj: Any) -> '{name}':")
    for key, value in json_data.items():
        var_name = (key)
        var_type = parse_type(key, value, nested_classes_dict)
        if "List" in var_type and var_name in nested_classes_dict:
            print(var_name, key, nested_classes_dict)
            class_def.append(f"        _{var_name} = [{nested_classes_dict[var_name]}.from_dict(k) for k in obj.get('{key}')]")
        elif var_name in nested_classes_dict:
            class_def.append(f"        _{var_name} = {nested_classes_dict[var_name]}.from_dict(obj.get('{key}'))")
        else: class_def.append(f"        _{var_name} = obj.get('{key}') if obj and '{key}' in obj else None")

    class_def.append(f"        return {name}({', '.join([f'_{var_name}' for var_name in json_data.keys()])})")

    return "\n".join(class_def)

nested_class_names = []

def generate_classes(name, json_data, classes):
    """Recursively generate class definitions for nested JSON."""

    base_name = "Playlist"

    if isinstance(json_data, dict):

        nested_classes_dict = {}

        for key, value in json_data.items():
            if isinstance(value, dict):
                nested_class_name = base_name + to_pascal_case(key)
                index = 1
                while nested_class_name in nested_class_names:
                    nested_class_name = base_name + to_pascal_case(key) + str(index)
                    index += 1

                generate_classes(nested_class_name, value, classes)
                nested_class_names.append(nested_class_name)
                nested_classes_dict[key] = nested_class_name

            elif isinstance(value, list) and value and isinstance(value[0], dict):
                nested_class_name = base_name + to_pascal_case(key)
                generate_classes(nested_class_name, value[0], classes)

                nested_class_names.append(nested_class_name)
                nested_classes_dict[key] = nested_class_name

        # print(nested_classes_dict)

        class_def = generate_class(name, json_data, nested_classes_dict)
        classes.append(class_def)

def main():
    # Load JSON data (replace 'your_file.json' with the path to your JSON file)
    with open('backend/json.json', 'r') as f:
        json_data = json.load(f)

    classes = []
    generate_classes("RawSpotifyApiPlaylist", json_data, classes)

    with open("backend/types.out.py", "w") as f:
        f.write("from typing import List, Dict, Any\n")
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
