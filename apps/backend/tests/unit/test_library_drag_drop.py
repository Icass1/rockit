"""CI installs frontend dependencies and Node before backend regressions."""

import subprocess
from pathlib import Path

import pytest


@pytest.mark.parametrize("test_file", ["libraryDragDrop.test.mjs", "libraryUrlDrop.test.mjs"])
def test_library_drag_policy_and_owned_playlist_writes(test_file: str) -> None:
    """Exercise the actual frontend policy and manager with deterministic HTTP fixtures."""
    root = Path(__file__).resolve().parents[4]
    result = subprocess.run(
        ["node", "--test", str(root / "apps/web/tests" / test_file)],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
