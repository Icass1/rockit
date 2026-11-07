"""CI verifies owner-window vinyl animation and finite virtual queue geometry."""

import subprocess
from pathlib import Path


def test_pip_animation_clock_and_recommendation_footer_geometry() -> None:
    """Run the actual frontend helpers with independent window clocks and long footers."""
    root = Path(__file__).resolve().parents[4]
    result = subprocess.run(
        ["node", "--test", str(root / "apps/web/tests/pipScrollRegressions.test.mjs")],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
