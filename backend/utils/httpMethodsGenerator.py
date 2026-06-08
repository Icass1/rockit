from pathlib import Path

from fastapi.routing import APIRoute
from pydantic import BaseModel


def snake_to_pascal(string: str) -> str:
    return "".join(x.capitalize() for x in string.lower().split("_"))


def snake_to_camel(snake_str: str):
    camel_string = snake_to_pascal(snake_str)
    return snake_str[0].lower() + camel_string[1:]


async def http_methods_generator():
    from backend.core.main import app

    http_path = Path("frontend/packages/shared/src/http/baseHttp.ts")
    http_path.touch(exist_ok=True)

    template = Path("backend/utils/httpTemplate.txt")

    text = ""

    routes: list[APIRoute] = [r for r in app.routes if isinstance(r, APIRoute)]
    for route in sorted(routes, key=lambda r: (r.path, r.name)):
        if len(route.methods) != 1:
            print("Each endpoint must support only 1 method")
            continue

        method = list(route.methods)[0]

        text += "\n\n\n"

        method_name = snake_to_camel(route.name)

        params: list[str] = []

        path = route.path

        for param_name in route.param_convertors.keys():  # type: ignore
            params.append(f"{snake_to_camel(param_name)}: string")

            path = path.replace(
                "{" + param_name + "}", "${" + snake_to_camel(param_name) + "}"
            )

        if not route.response_model:
            print("Path", route.path, "doesn't have a response model")
            continue

        if method == "GET":
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += f"        return this.apiGetAsync(`{path}`, dto.{route.response_model.__name__}Schema)\n"
            text += "    }"

        elif method == "POST":
            body_params = route.dependant.body_params

            if not body_params:
                print("Path", route.path, "doesn't have a body params")
                continue

            if len(body_params) != 1:
                print("Path", route.path, "has multiple request body")
                continue

            body_type = body_params[0].type_

            if not isinstance(body_type, type) or not issubclass(body_type, BaseModel):
                print(
                    f"Path {route.path}: body param is not a Pydantic BaseModel, skipping"
                )
                continue

            request_model = body_type.__name__

            params.append(f"payload: dto.{request_model}")

            text += f"    static async {method_name}({', '.join(params)})" + " {\n"
            text += f"        return this.apiPostAsync(`{path}`, dto.{request_model}Schema, dto.{route.response_model.__name__}Schema, payload)\n"
            text += "    }"

        elif method == "DELETE":
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += f"        return this.apiDeleteAsync(`{path}`, dto.{route.response_model.__name__}Schema)\n"
            text += "    }"

        elif method == "PATCH":
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += f"        return this.apiPatchAsync(`{path}`, dto.{route.response_model.__name__}Schema)\n"
            text += "    }"

        else:
            print(method, "is not implemented")

    http_path.write_text(template.read_text().replace("<HTTP_METHODS_HERE/>", text))

    try:
        import subprocess

        subprocess.run(
            ["prettier", "--write", str(http_path).replace("frontend/", "")],
            cwd="frontend",
            check=True,
        )
        print("Formatted generated files with Prettier")
    except Exception as e:
        print(f"Could not format files with Prettier: {e}")
