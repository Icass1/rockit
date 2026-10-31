"""CI executes the real web player with deterministic native-media/visibility fixtures."""

import subprocess
from pathlib import Path


def test_background_handoff_and_adaptive_transition_regressions() -> None:
    """Cover native iOS handoffs, missed events, ownership and desktop transitions."""
    root = Path(__file__).resolve().parents[4]
    result = subprocess.run(
        ["node", "--test", str(root / "apps/web/tests/adaptiveTransitions.test.mjs")],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
