import re
from pathlib import Path
from typing import get_args, get_origin

from fastapi._compat import ModelField
from fastapi.routing import APIRoute
from pydantic import BaseModel


def snake_to_pascal(string: str) -> str:
    return "".join(x.capitalize() for x in string.lower().split("_"))


def snake_to_camel(snake_str: str) -> str:
    camel_string = snake_to_pascal(snake_str)
    return snake_str[0].lower() + camel_string[1:]


def build_query_params(
    query_params: list[ModelField],
) -> tuple[list[str], str, str]:
    """Build the TS signature, query-building preamble and path suffix.

    Query params without a default value (required) become required TS params
    and are always appended. Query params with a default value (optional) become
    optional TS params and are only appended to the query string when provided.
    URLSearchParams handles URL-encoding of the values.

    Returns a tuple of (signature_parts, preamble, path_suffix). When there are
    no query params, preamble and path_suffix are empty strings.
    """

    if not query_params:
        return [], "", ""

    # Required params first so optional TS params never precede required ones.
    ordered = sorted(query_params, key=lambda qp: not qp.required)

    signature_parts: list[str] = []
    append_lines: list[str] = []

    for qp in ordered:
        camel_name = snake_to_camel(qp.name)
        if qp.type_ is float or qp.type_ is int:
            ts_type = "number"
        elif qp.type_ is bool:
            ts_type = "boolean"
        else:
            ts_type = "string"

        optional = not qp.required
        signature_parts.append(f"{camel_name}{'?' if optional else ''}: {ts_type}")

        append = f'queryParams.append("{qp.name}", `${{{camel_name}}}`)'
        if optional:
            append_lines.append(f"        if ({camel_name} !== undefined) {append}\n")
        else:
            append_lines.append(f"        {append}\n")

    preamble = "        const queryParams = new URLSearchParams()\n"
    preamble += "".join(append_lines)
    preamble += "        const queryString = queryParams.toString()\n"

    path_suffix = '${queryString ? `?${queryString}` : ""}'
    return signature_parts, preamble, path_suffix


def format_route_path(path: str, parameter_name: str) -> str:
    """Interpolate and encode route parameters, including FastAPI path converters."""
    pattern = r"\{" + re.escape(parameter_name) + r"(?::[^}]+)?\}"
    replacement = "${encodeURIComponent(" + snake_to_camel(parameter_name) + ")}"
    return re.sub(pattern, lambda _match: replacement, path)


def response_schema(model: object) -> str:
    """Generate the Zod expression for a model or a list of model responses."""
    if get_origin(model) is list:
        return f"{response_schema(get_args(model)[0])}.array()"
    if isinstance(model, type) and issubclass(model, BaseModel):
        return f"dto.{model.__name__}Schema"
    raise TypeError(f"Unsupported response model: {model!r}")


async def http_methods_generator() -> None:
    from app.main import app

    project_root = Path(__file__).resolve().parents[4]
    http_path = project_root / "packages/shared/src/http/baseHttp.ts"
    http_path.touch(exist_ok=True)

    template = Path(__file__).with_name("httpTemplate.txt")

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

            path = format_route_path(path, param_name)

        if not route.response_model:
            query_sig, query_preamble, query_suffix = build_query_params(
                route.dependant.query_params
            )
            params.extend(query_sig)

            output = "        return `${BACKEND_URL}" + path + "`\n"

            if query_suffix:
                output = output.rsplit("`\n", 1)[0] + query_suffix + "`\n"

            text += f"    static {method_name.replace('Async', '')}URL({','.join(params)})" + " {\n"
            text += query_preamble
            text += output
            text += "    }"

            continue

        if method == "GET":
            query_sig, query_preamble, query_suffix = build_query_params(
                route.dependant.query_params
            )
            params.extend(query_sig)
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += query_preamble
            text += (
                f"        return this.apiGetAsync(`{path}{query_suffix}`, "
                f"{response_schema(route.response_model)})\n"
            )
            text += "    }"

        elif method == "POST":
            body_params = route.dependant.body_params

            if not body_params:
                text += f"    static async {method_name}({','.join(params)})" + " {\n"
                text += (
                    f"        return this.apiFetchAsync(`{path}`, "
                    f"{response_schema(route.response_model)}, "
                    f'{{ method: "POST" }})\n'
                )
                text += "    }"
                continue

            if len(body_params) != 1:
                print("Path", route.path, "has multiple request body")
                continue

            body_type = body_params[0].type_

            if not isinstance(body_type, type) or not issubclass(body_type, BaseModel):
                print(f"Path {route.path}: body param is not a Pydantic BaseModel, skipping")
                continue

            request_model = body_type.__name__

            params.append(f"payload: dto.{request_model}")

            text += f"    static async {method_name}({', '.join(params)})" + " {\n"
            text += (
                f"        return this.apiPostAsync(`{path}`, "
                f"dto.{request_model}Schema, "
                f"{response_schema(route.response_model)}, payload)\n"
            )
            text += "    }"

        elif method == "DELETE":
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += (
                f"        return this.apiDeleteAsync(`{path}`, "
                f"{response_schema(route.response_model)})\n"
            )
            text += "    }"

        elif method == "PATCH":
            body_params = route.dependant.body_params
            payload_argument = ""
            if body_params:
                body_type = body_params[0].type_
                if (
                    len(body_params) != 1
                    or not isinstance(body_type, type)
                    or not issubclass(body_type, BaseModel)
                ):
                    raise TypeError(f"PATCH {route.path} requires one Pydantic body model")
                params.append(f"payload: dto.{body_type.__name__}")
                payload_argument = ", payload"
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += (
                f"        return this.apiPatchAsync(`{path}`, "
                f"{response_schema(route.response_model)}{payload_argument})\n"
            )
            text += "    }"

        else:
            print(method, "is not implemented")

    http_path.write_text(template.read_text().replace("<HTTP_METHODS_HERE/>", text))

    try:
        import subprocess

        subprocess.run(
            ["pnpm", "exec", "prettier", "--write", str(http_path).replace("frontend/", "")],
            cwd=Path(__file__).resolve().parents[4],
            check=True,
        )
        print("Formatted generated files with Prettier")
    except Exception as e:
        print(f"Could not format files with Prettier: {e}")
