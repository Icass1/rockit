import re
import typing
from collections.abc import Sequence
from pathlib import Path
from types import UnionType
from typing import Any, cast

from fastapi import UploadFile
from fastapi._compat import ModelField
from fastapi.routing import APIRoute
from pydantic import BaseModel


def snake_to_pascal(string: str) -> str:
    return "".join(x.capitalize() for x in string.lower().split("_"))


def snake_to_camel(snake_str: str) -> str:
    camel_string = snake_to_pascal(snake_str)
    return snake_str[0].lower() + camel_string[1:]


def format_route_path(path: str, param_name: str) -> str:
    """Interpolate and encode a route parameter, including path converters."""
    return re.sub(
        pattern=r"\{" + re.escape(param_name) + r"(?::[^}]+)?\}",
        repl="${encodeURIComponent(" + snake_to_camel(param_name) + ")}",
        string=path,
    )


def response_schema(response_model: object) -> str:
    """Build a response validator while preserving list item models."""
    if typing.get_origin(response_model) is list:
        item_model = typing.get_args(response_model)[0]
        return response_schema(response_model=item_model) + ".array()"
    return f"dto.{cast(type[BaseModel], response_model).__name__}Schema"


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
    ordered = sorted(query_params, key=lambda qp: not qp.field_info.is_required())

    signature_parts: list[str] = []
    append_lines: list[str] = []

    for qp in ordered:
        camel_name = snake_to_camel(qp.name)
        qp_type = qp.field_info.annotation
        qp_origin = typing.get_origin(qp_type)
        if qp_origin in (typing.Union, UnionType):
            non_none_types = [arg for arg in typing.get_args(qp_type) if arg is not type(None)]
            if len(non_none_types) == 1:
                qp_type = non_none_types[0]

        is_array = typing.get_origin(qp_type) is list
        if is_array:
            array_type = typing.get_args(qp_type)
            qp_type = array_type[0] if array_type else str

        if qp_type is float or qp_type is int:
            ts_type = "number"
        elif qp_type is bool:
            ts_type = "boolean"
        else:
            ts_type = "string"
        if is_array:
            ts_type += "[]"

        optional = not qp.field_info.is_required()
        signature_parts.append(f"{camel_name}{'?' if optional else ''}: {ts_type}")

        if is_array:
            append = (
                f'{camel_name}.forEach((value) => queryParams.append("{qp.name}", `${{value}}`))'
            )
            if optional:
                append_lines.append(f"        if ({camel_name} !== undefined) {append}\n")
            else:
                append_lines.append(f"        {append}\n")
        else:
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


def collect_api_routes(routes: Sequence[object]) -> list[APIRoute]:
    """Flatten FastAPI routes.

    Newer FastAPI versions (>= 0.124) defer included routers via
    ``fastapi.routing._IncludedRouter`` instead of flattening them into
    ``APIRoute`` instances on ``app.routes``. Recurse into
    ``original_router.routes`` to collect every concrete ``APIRoute``.
    """

    api_routes: list[APIRoute] = []

    for route in routes:
        if isinstance(route, APIRoute):
            api_routes.append(route)
        elif type(route).__name__ == "_IncludedRouter":
            included_router = cast(Any, route)
            api_routes.extend(collect_api_routes(included_router.original_router.routes))

    return api_routes


async def http_methods_generator() -> None:
    from app.main import app

    http_path = Path("packages/shared/src/http/baseHttp.ts")
    http_path.touch(exist_ok=True)

    template = Path("apps/backend/core/utils/httpTemplate.txt")

    text = ""

    routes: list[APIRoute] = collect_api_routes(app.routes)
    for route in sorted(routes, key=lambda r: (r.path, r.name)):
        methods = route.methods
        if len(methods) != 1:
            print("Each endpoint must support only 1 method")
            continue

        method = list(methods)[0]

        text += "\n\n\n"

        method_name = snake_to_camel(route.name)

        params: list[str] = []

        path = route.path

        for param_name in route.param_convertors.keys():
            params.append(f"{snake_to_camel(param_name)}: string")

            path = format_route_path(path=path, param_name=param_name)

        if not route.response_model:
            query_sig, query_preamble, query_suffix = build_query_params(
                route.dependant.query_params
            )
            params.extend(query_sig)

            output = f"        return `{path}`\n"

            if query_suffix:
                output = output.rsplit("`\n", 1)[0] + query_suffix + "`\n"

            text += f"    static {method_name.replace('Async', '')}URL({','.join(params)})" + " {\n"
            text += query_preamble
            text += output
            text += "    }"

            continue

        schema = response_schema(response_model=route.response_model)

        if method == "GET":
            query_sig, query_preamble, query_suffix = build_query_params(
                route.dependant.query_params
            )

            params.extend(query_sig)
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += query_preamble
            text += f"        return this.apiGetAsync(`{path}{query_suffix}`, {schema})\n"
            text += "    }"

        elif method == "POST":
            body_params = route.dependant.body_params

            if not body_params:
                text += f"    static async {method_name}({','.join(params)})" + " {\n"
                text += (
                    f'        return this.apiFetchAsync(`{path}`, {schema}, {{ method: "POST" }})\n'
                )
                text += "    }"
                continue

            if len(body_params) != 1:
                print("Path", route.path, "has multiple request body")
                continue

            body_type = body_params[0].field_info.annotation

            if isinstance(body_type, type) and issubclass(body_type, UploadFile):
                params.extend(["file: Blob", "filename: string"])
                text += f"    static async {method_name}({', '.join(params)})" + " {\n"
                text += (
                    f"        return this.apiPostFileAsync(`{path}`, {schema}, file, filename)\n"
                )
                text += "    }"
                continue

            if not isinstance(body_type, type) or not issubclass(body_type, BaseModel):
                print(f"Path {route.path}: body param is not a Pydantic BaseModel, skipping")
                continue

            request_model = body_type.__name__

            params.append(f"payload: dto.{request_model}")

            text += f"    static async {method_name}({', '.join(params)})" + " {\n"
            text += (
                f"        return this.apiPostAsync(`{path}`, dto.{request_model}Schema, "
                f"{schema}, payload)\n"
            )
            text += "    }"

        elif method == "DELETE":
            text += f"    static async {method_name}({','.join(params)})" + " {\n"
            text += f"        return this.apiDeleteAsync(`{path}`, {schema})\n"
            text += "    }"

        elif method == "PATCH":
            body_params = route.dependant.body_params
            if not body_params:
                text += f"    static async {method_name}({','.join(params)})" + " {\n"
                text += f"        return this.apiPatchAsync(`{path}`, {schema})\n"
                text += "    }"
                continue

            if len(body_params) != 1:
                print("Path", route.path, "has multiple request body")
                continue

            body_type = body_params[0].field_info.annotation

            if not isinstance(body_type, type) or not issubclass(body_type, BaseModel):
                print(f"Path {route.path}: body param is not a Pydantic BaseModel, skipping")
                continue

            request_model = body_type.__name__
            params.append(f"payload: dto.{request_model}")

            text += f"    static async {method_name}({', '.join(params)})" + " {\n"
            text += (
                f"        return this.apiPatchBodyAsync(`{path}`, dto.{request_model}Schema, "
                f"{schema}, payload)\n"
            )
            text += "    }"

        else:
            print(method, "is not implemented")

    http_path.write_text(template.read_text().replace("<HTTP_METHODS_HERE/>", text))

    try:
        import subprocess

        subprocess.run(
            ["pnpm", "exec", "prettier", "--write", str(http_path)],
            cwd=Path.cwd(),
            check=True,
        )
        print("Formatted generated files with Prettier")
    except Exception as e:
        print(f"Could not format files with Prettier: {e}")
