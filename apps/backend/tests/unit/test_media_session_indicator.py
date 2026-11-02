"""CI runs lock-screen state reporting regressions against the actual web manager."""

import subprocess
from pathlib import Path


def test_media_session_state_reporting_does_not_control_audio() -> None:
    """Check continuous handoffs, pause intent, native resets and reporting cleanup."""
    root = Path(__file__).resolve().parents[4]
    result = subprocess.run(
        ["node", "--test", str(root / "apps/web/tests/mediaSessionState.test.mjs")],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
