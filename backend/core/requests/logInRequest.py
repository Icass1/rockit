from typing import Any
from pydantic import BaseModel
from pydantic import field_validator

from backend.core.enums.platformEnum import PlatformEnum


class LoginRequest(BaseModel):
    username: str
    password: str
    platform: PlatformEnum

    @field_validator("platform", mode="before")
    @classmethod
    def convert_platform(cls, v: str | int | Any) -> "PlatformEnum":
        # If input is already numeric (1/2), accept it.
        if isinstance(v, int):
            return PlatformEnum(v)

        # If input is a string ("WEB"), convert it.
        if isinstance(v, str):
            try:
                return PlatformEnum[v]
            except KeyError:
                raise ValueError("Invalid value for platform")

        raise ValueError("Invalid type for platform")
