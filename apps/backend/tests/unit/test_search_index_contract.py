"""Provider SQL projections must agree before downstream media filters are applied."""

import re
from importlib import import_module
from pathlib import Path

import pytest

from core.framework.provider.baseMediaProvider import BaseMediaProvider

pytestmark = pytest.mark.unit


def test_every_provider_search_projection_uses_the_shared_column_contract() -> None:
    """A station URL in image_id breaks song-only queries at UNION planning time."""
    backend = Path(__file__).resolve().parents[2]
    expected = [
        "internal_id",
        "public_id",
        "name",
        "subtitle",
        "media_type_key",
        "provider_name",
        "image_id",
    ]
    checked = 0
    for path in backend.glob("*/framework/provider/*.py"):
        if path.parts[-4] == "core":
            continue
        module = import_module(".".join(path.relative_to(backend).with_suffix("").parts))
        provider = getattr(module, "provider", None)
        if not isinstance(provider, BaseMediaProvider):
            continue
        fragment = provider.get_search_index_cte_fragment()
        if not fragment:
            continue
        aliases = re.findall(
            r"\bAS\s+(internal_id|public_id|name|subtitle|media_type_key|provider_name|image_id|image_url)\b",
            fragment,
            re.IGNORECASE,
        )
        assert aliases and len(aliases) % len(expected) == 0, path
        for start in range(0, len(aliases), len(expected)):
            assert aliases[start : start + len(expected)] == expected, path
        checked += 1
    assert checked > 0
