"""Direct endpoint invocation helpers for the migrated feature scenarios."""

import json
from collections.abc import Mapping
from inspect import signature
from io import BytesIO
from typing import Any, cast, get_args, get_origin, get_type_hints
from urllib.parse import parse_qs, urlsplit

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.params import Depends, Param
from fastapi.routing import APIRoute
from pydantic import BaseModel, TypeAdapter, ValidationError
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import Scope

from core.access.db.ormModels.user import UserRow
from tests.fakes import RecordingSession

# pyright: basic


class DirectResponse:
    """Small response value returned by direct endpoint calls."""

    def __init__(self, status_code: int, payload: object) -> None:
        """Store a JSON-compatible endpoint response."""
        if isinstance(payload, Response):
            self.status_code = payload.status_code
            self.headers = payload.headers
            self.content = payload.body
            self._payload = None
            self.text = ""
            return
        self.status_code = status_code
        self.headers = Headers()
        self._payload = jsonable_encoder(payload, by_alias=True)
        self.text = json.dumps(self._payload, default=str)
        self.content = self.text.encode()

    def json(self) -> Any:  # noqa: ANN401
        """Return the encoded endpoint payload."""
        return self._payload


class DirectEndpointHarness:
    """Resolve a registered route and invoke its endpoint function without HTTP."""

    def __init__(self, app: FastAPI, session: RecordingSession) -> None:
        """Bind a FastAPI route table to one isolated fake session."""
        self.app = app
        self.session = session
        self.rendered_documents: list[str] = []
        self.parsed_payloads: list[BaseModel] = []
        seeded_users = session.rows(UserRow)
        self.user: Any = (
            seeded_users[0]
            if seeded_users
            else type(
                "TestUser",
                (),
                {
                    "id": 1,
                    "public_id": "direct-test-user",
                    "username": "direct-test",
                    "admin": True,
                    "lang_id": 1,
                    "language": type("TestLanguage", (), {"lang_code": "en"})(),
                    "image": type("TestImage", (), {"id": 1, "public_id": "test-image"})(),
                    "ui_mode": type("TestUiMode", (), {"key": 1})(),
                    "job_title": type("TestJobTitle", (), {"name": "Test"})(),
                    "email": "direct-test@example.com",
                    "password_hash": "$2b$12$MlUqxt/ek1fFleR4Ch7RZu16z/8awQNz1z.uLVNnWbvjT3uLZXe9e",
                    "sessions": [],
                },
            )()
        )

    def get(self, path: str, **kwargs: Any) -> DirectResponse:  # noqa: ANN401
        """Call a GET endpoint directly."""
        return self.invoke("GET", path, **kwargs)

    def call(self, method: str, path: str, **kwargs: Any) -> DirectResponse:  # noqa: ANN401
        """Call a controller endpoint method with JSON-shaped input values."""
        return self.invoke(method.upper(), path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> DirectResponse:  # noqa: ANN401
        """Call a POST endpoint directly."""
        return self.invoke("POST", path, **kwargs)

    def patch(self, path: str, **kwargs: Any) -> DirectResponse:  # noqa: ANN401
        """Call a PATCH endpoint directly."""
        return self.invoke("PATCH", path, **kwargs)

    def put(self, path: str, **kwargs: Any) -> DirectResponse:  # noqa: ANN401
        """Call a PUT endpoint directly."""
        return self.invoke("PUT", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> DirectResponse:  # noqa: ANN401
        """Call a DELETE endpoint directly."""
        return self.invoke("DELETE", path, **kwargs)

    def registered_routes(self) -> list[APIRoute]:
        """Return the FastAPI routes available for direct endpoint invocation."""
        return self._routes()

    def invoke(self, method: str, path: str, **kwargs: Any) -> DirectResponse:  # noqa: ANN401
        """Parse endpoint inputs and call the matched controller function."""
        split = urlsplit(path)
        query = parse_qs(split.query)
        query.update(
            {
                key: [str(item) for item in value]
                if isinstance(value, (list, tuple))
                else [str(value)]
                for key, value in kwargs.pop("params", {}).items()
            }
        )
        body = kwargs.pop("json", None)
        files = kwargs.pop("files", None)
        headers = kwargs.pop("headers", {})
        if kwargs:
            body = kwargs if body is None else body
        scope: Scope = cast(
            Scope,
            {
                "type": "http",
                "http_version": "1.1",
                "method": method,
                "scheme": "http",
                "path": split.path,
                "raw_path": split.path.encode(),
                "query_string": split.query.encode(),
                "headers": [
                    (str(key).lower().encode(), str(value).encode())
                    for key, value in headers.items()
                ],
                "server": ("direct-test", 80),
                "client": ("direct-test", 0),
                "state": {"db": self.session, "user": self.user, "session_id": "test-session"},
            },
        )
        request = Request(scope)
        if self.user is not None:
            request.state.user = self.user
            request.state.session_id = "direct-test-session"
            self.session.info["added_by"] = self.user.id
        route: APIRoute | None = None
        path_params: Mapping[str, Any] = {}
        endpoint = None
        for candidate in self._routes():
            if method not in (candidate.methods or set()):
                continue
            matched_path = candidate.path_regex.fullmatch(split.path)
            if matched_path is None:
                continue
            route = candidate
            path_params = matched_path.groupdict()
            endpoint = candidate.endpoint
            break
        if route is None:
            return DirectResponse(404, {"detail": f"No direct endpoint for {method} {path}"})

        assert endpoint is not None
        hints = get_type_hints(endpoint)
        arguments: dict[str, Any] = {}
        for name, parameter in signature(endpoint).parameters.items():
            annotation = hints.get(name, parameter.annotation)
            if name == "request":
                arguments[name] = request
                continue
            if annotation is Response:
                arguments[name] = Response()
                continue
            if isinstance(parameter.default, Depends):
                dependency = parameter.default.dependency
                from core.middlewares.authMiddleware import AuthMiddleware as AuthDependency

                if dependency in {
                    AuthDependency.auth_dependency,
                    AuthDependency.admin_dependency,
                }:
                    if self.user is None:
                        return DirectResponse(401, {"detail": "Not logged in."})
                    if dependency is AuthDependency.admin_dependency and not self.user.admin:
                        return DirectResponse(403, {"detail": "Admin access required."})
                    request.state.user = self.user
                    request.state.session_id = "direct-test-session"
                    self.session.info["added_by"] = self.user.id
                    arguments[name] = None
                    continue
            query_name = (
                parameter.default.alias
                if isinstance(parameter.default, Param) and parameter.default.alias
                else name
            )
            if name in path_params:
                arguments[name] = TypeAdapter(annotation).validate_python(path_params[name])
                continue
            if isinstance(annotation, type) and issubclass(annotation, BaseModel):
                try:
                    arguments[name] = annotation.model_validate(body or {})
                except ValidationError as error:
                    return DirectResponse(422, {"detail": error.errors(include_url=False)})
                self.parsed_payloads.append(arguments[name])
                continue
            if name in {"file", "image"} and files:
                file_name, content, content_type = next(iter(files.values()))
                arguments[name] = UploadFile(
                    filename=file_name,
                    file=BytesIO(content.encode() if isinstance(content, str) else content),
                    headers=Headers({"content-type": content_type}),
                )
                continue
            if query_name in query:
                try:
                    list_annotation = get_origin(annotation) is list or any(
                        get_origin(argument) is list for argument in get_args(annotation)
                    )
                    query_value = query[query_name] if list_annotation else query[query_name][-1]
                    arguments[name] = TypeAdapter(annotation).validate_python(query_value)
                except ValidationError as error:
                    return DirectResponse(422, {"detail": error.errors(include_url=False)})
                continue
            if isinstance(parameter.default, Param):
                from pydantic_core import PydanticUndefined

                if parameter.default.default is PydanticUndefined:
                    return DirectResponse(
                        422,
                        {
                            "detail": [
                                {
                                    "type": "missing",
                                    "loc": ["query", query_name],
                                    "msg": "Field required",
                                    "input": None,
                                }
                            ]
                        },
                    )
                arguments[name] = parameter.default.default
                continue
                continue
            if parameter.default is parameter.empty:
                raise TypeError(f"Cannot supply direct endpoint argument {name!r} for {path}")

        try:
            response = endpoint(**arguments)
            if hasattr(response, "__await__"):
                import asyncio

                response = asyncio.run(response)
            import asyncio

            asyncio.run(self.session.flush())
            return DirectResponse(200, response)
        except HTTPException as error:
            return DirectResponse(error.status_code, {"detail": error.detail})
        except ValidationError as error:
            return DirectResponse(422, {"detail": error.errors(include_url=False)})

    def _routes(self) -> list[APIRoute]:
        """Flatten lazily included FastAPI routers into their endpoint routes."""
        routes: list[APIRoute] = []

        def visit(router: object) -> None:
            for route in getattr(router, "routes", []):
                if isinstance(route, APIRoute):
                    routes.append(route)
                elif hasattr(route, "original_router"):
                    visit(getattr(route, "original_router"))

        for route in self.app.routes:
            if isinstance(route, APIRoute):
                routes.append(route)
            elif hasattr(route, "original_router"):
                visit(getattr(route, "original_router"))
        return routes


def call_payload(payload: Mapping[str, object]) -> dict[str, object]:
    """Return a JSON dictionary that can be passed to the endpoint harness."""
    return dict(payload)
