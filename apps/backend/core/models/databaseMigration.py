"""Shared metadata for core and provider-owned forward-only database migrations."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Migration:
    version: int
    name: str
    statements: tuple[str, ...]
