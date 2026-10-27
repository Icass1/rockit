"""Support functions for direct per-controller endpoint tests."""

import re
from datetime import UTC, date, datetime, time
from enum import Enum
from inspect import signature
from typing import Any, Literal, cast, get_args, get_origin, get_type_hints

from fastapi.params import Param
from fastapi.routing import APIRoute
from pydantic import BaseModel, ValidationError

from app.main import app
from tests.direct_harness import DirectEndpointHarness
from tests.fakes import RecordingSession


def _belongs_to_controller(route: APIRoute, controller_name: str | None) -> bool:
    """Whether a registered route is implemented by the requested controller module."""
    return controller_name is None or route.endpoint.__module__.endswith(controller_name)


def invalid_body_route_cases(
    controller_name: str | None = None,
) -> list[tuple[str, str, dict[str, object]]]:
    """Build one malformed JSON payload for every registered endpoint with a body model."""
    cases: list[tuple[str, str, dict[str, object]]] = []
    harness = DirectEndpointHarness(app, RecordingSession())
    for route in harness.registered_routes():
        if not _belongs_to_controller(route, controller_name):
            continue
        payload_parameters = [
            parameter.annotation
            for parameter in signature(route.endpoint).parameters.values()
            if isinstance(parameter.annotation, type)
            and issubclass(parameter.annotation, BaseModel)
        ]
        if not payload_parameters:
            continue
        model = payload_parameters[0]
        body: dict[str, object] | None = None
        for name, field in model.model_fields.items():
            candidate: dict[str, object] = {field.alias or name: {"unexpected": True}}
            try:
                model.model_validate(candidate)
            except ValidationError:
                body = candidate
                break
        if body is not None:
            path = _concrete_route_path(route)
            method = sorted(route.methods or {"POST"})[0]
            cases.append((method, path, body))
    return cases


def _concrete_route_path(route: APIRoute) -> str:
    """Replace typed and path-style route parameters with valid test values."""
    path = route.path
    hints = get_type_hints(route.endpoint)
    for parameter in route.param_convertors:
        replacement = "1" if hints.get(parameter) is int else "direct-value"
        path = re.sub(r"\{" + re.escape(parameter) + r"(?::[^}]+)?\}", replacement, path)
    return path


def _sample_value(annotation: object, field_name: str) -> object:
    """Build a small JSON-compatible value for a request-model field annotation."""
    origin = get_origin(annotation)
    arguments = get_args(annotation)
    if origin is not None and arguments:
        if origin is list:
            return [_sample_value(arguments[0], field_name)]
        if origin is tuple:
            return tuple(_sample_value(item, field_name) for item in arguments)
        if origin is Literal:
            return arguments[0]
        non_null = [item for item in arguments if item is not type(None)]
        if non_null:
            return _sample_value(non_null[0], field_name)
    if isinstance(annotation, type) and issubclass(annotation, Enum):
        return next(iter(annotation))
    if annotation is str:
        if "password" in field_name.lower():
            return "password123"
        return "test@example.com" if "email" in field_name.lower() else "test"
    if annotation is int:
        return 1
    if annotation is float:
        return 1.0
    if annotation is bool:
        return True
    if annotation is datetime:
        return datetime(2026, 1, 1, tzinfo=UTC)
    if isinstance(annotation, type) and "datetime" in annotation.__name__.lower():
        return datetime(2026, 1, 1, tzinfo=UTC)
    if annotation is date:
        return date(2026, 1, 1)
    if annotation is time:
        return time(9, 0)
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return _sample_payload(annotation)
    return "test"


def _sample_payload(model: type[BaseModel]) -> dict[str, object]:
    """Build JSON from the API's camel-case aliases, independently of model aliases."""
    payload: dict[str, object] = {}
    for name, field in model.model_fields.items():
        has_wire_alias = any(
            alias is not None
            for alias in (field.alias, field.validation_alias, field.serialization_alias)
        )
        words = name.split("_")
        camel_name = words[0] + "".join(word.title() for word in words[1:])
        wire_name = camel_name if has_wire_alias else name
        payload[wire_name] = _sample_value(field.annotation, name)
    return payload


def assert_wire_contract_and_values(payload_model: BaseModel, body: dict[str, object]) -> None:
    """Check parsed values and aliases against the external camel-case contract."""
    for name, field in type(payload_model).model_fields.items():
        aliases = (field.alias, field.validation_alias, field.serialization_alias)
        has_wire_alias = any(alias is not None for alias in aliases)
        words = name.split("_")
        expected_name = words[0] + "".join(word.title() for word in words[1:])
        expected_wire_name = expected_name if has_wire_alias else name
        if field.alias is not None:
            assert field.alias == expected_wire_name, (
                f"{type(payload_model).__name__}.{name} should use alias {expected_wire_name!r}, "
                f"got {field.alias!r}"
            )
        if field.validation_alias is not None:
            assert field.validation_alias == expected_wire_name, (
                f"{type(payload_model).__name__}.{name} should accept {expected_wire_name!r}, "
                f"got {field.validation_alias!r}"
            )
        if field.serialization_alias is not None:
            assert field.serialization_alias == expected_wire_name, (
                f"{type(payload_model).__name__}.{name} should serialize as "
                f"{expected_wire_name!r}, got {field.serialization_alias!r}"
            )
        if expected_wire_name in body:
            expected_value = body[expected_wire_name]
            actual_value = getattr(payload_model, name)
            if isinstance(actual_value, BaseModel) and isinstance(expected_value, dict):
                assert_wire_contract_and_values(
                    actual_value, cast(dict[str, object], expected_value)
                )
            elif isinstance(actual_value, list) and isinstance(expected_value, list):
                parsed_values = cast(list[Any], actual_value)
                expected_values = cast(list[object], expected_value)
                if parsed_values and isinstance(parsed_values[0], BaseModel):
                    assert len(parsed_values) == len(expected_values)
                    for parsed_item, expected_item in zip(
                        parsed_values, expected_values, strict=True
                    ):
                        assert isinstance(expected_item, dict)
                        assert_wire_contract_and_values(
                            cast(BaseModel, parsed_item), cast(dict[str, object], expected_item)
                        )
                else:
                    assert actual_value == expected_value, (
                        f"{type(payload_model).__name__}.{name} parsed {actual_value!r}, "
                        f"expected {expected_value!r}"
                    )
            else:
                assert actual_value == expected_value, (
                    f"{type(payload_model).__name__}.{name} parsed {actual_value!r}, "
                    f"expected {expected_value!r} from {expected_wire_name!r}"
                )


def controller_endpoint_cases(
    controller_name: str,
) -> list[tuple[str, str, dict[str, object] | None, dict[str, object], dict[str, object]]]:
    """Build one direct invocation case for every HTTP method on a controller route."""
    cases: list[
        tuple[str, str, dict[str, object] | None, dict[str, object], dict[str, object]]
    ] = []
    harness = DirectEndpointHarness(app, RecordingSession())
    for route in harness.registered_routes():
        if not _belongs_to_controller(route, controller_name):
            continue
        hints = get_type_hints(route.endpoint)
        model = next(
            (
                hints.get(name, parameter.annotation)
                for name, parameter in signature(route.endpoint).parameters.items()
                if isinstance(hints.get(name, parameter.annotation), type)
                and issubclass(hints.get(name, parameter.annotation), BaseModel)
            ),
            None,
        )
        body = _sample_payload(model) if model is not None else None
        path = _concrete_route_path(route)
        query: dict[str, object] = {}
        files: dict[str, object] = {}
        path_parameters = set(route.param_convertors)
        for name, parameter in signature(route.endpoint).parameters.items():
            annotation = hints.get(name, parameter.annotation)
            if name in {"request", "_"} or name in path_parameters or annotation is model:
                continue
            if name in {"file", "image"}:
                files[name] = ("direct-test.png", b"image-bytes", "image/png")
                continue
            if isinstance(parameter.default, Param):
                from pydantic_core import PydanticUndefined

                if parameter.default.default is PydanticUndefined:
                    query_name = parameter.default.alias or name
                    query[query_name] = _sample_value(annotation, name)
                continue
            if parameter.default is parameter.empty:
                query[name] = _sample_value(annotation, name)
        for method in sorted(route.methods or set()):
            cases.append((method, path, body, query, files))
    return cases
