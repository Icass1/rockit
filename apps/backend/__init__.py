"""Backend package compatibility setup."""

import sys
from pathlib import Path

# The backend's internal modules use top-level imports such as ``core`` and
# ``config``. Make the backend directory importable when the package is
# launched from the repository root (for example, ``python -m apps.backend``).
_BACKEND_ROOT = str(Path(__file__).resolve().parent)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)
