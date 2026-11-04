"""Export the authoritative English vocabulary for first-render/offline fallbacks."""

import json
from pathlib import Path


def generate_vocabulary_fallback(vocabulary: dict[str, str]) -> None:
    """Write a deterministic JSON artifact without database access."""
    target = Path("packages/shared/src/i18n/en.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(vocabulary, ensure_ascii=False, indent=4, sort_keys=True) + "\n")
