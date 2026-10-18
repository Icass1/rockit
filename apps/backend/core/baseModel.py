import types as _builtin_types
from datetime import datetime
from typing import Any, Union, get_args, get_origin

from pydantic import AwareDatetime
from pydantic import BaseModel as _PydanticBaseModel
from pydantic._internal._model_construction import ModelMetaclass


def _replace_datetime(annotation: Any) -> Any:
    if annotation is datetime:
        return AwareDatetime

    origin = get_origin(annotation)
    if origin is None:
        return annotation

    args = get_args(annotation)
    if not args:
        return annotation

    new_args = tuple(_replace_datetime(a) for a in args)
    if new_args == args:
        return annotation

    if origin is Union or isinstance(annotation, _builtin_types.UnionType):
        return Union[new_args]

    try:
        return origin[new_args[0]] if len(new_args) == 1 else origin[new_args]
    except TypeError:
        return annotation


class _AwareDatetimeMeta(ModelMetaclass):
    def __new__(
        mcs,
        name: str,
        bases: tuple[type, ...],
        namespace: dict[str, Any],
        **kwargs: Any,
    ):
        if "__annotations__" in namespace:
            annotations = namespace["__annotations__"]
            namespace["__annotations__"] = {
                k: _replace_datetime(v) for k, v in annotations.items()
            }
        return super().__new__(mcs, name, bases, namespace, **kwargs)


class BaseModel(_PydanticBaseModel, metaclass=_AwareDatetimeMeta):
    pass
