"""CI installs frontend dependencies and Node before backend regressions."""

import subprocess
from pathlib import Path


def test_library_drag_policy_and_owned_playlist_writes() -> None:
    """Exercise the actual frontend policy and manager with deterministic HTTP fixtures."""
    root = Path(__file__).resolve().parents[4]
    result = subprocess.run(
        ["node", "--test", str(root / "apps/web/tests/libraryDragDrop.test.mjs")],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
