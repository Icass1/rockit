"""Migration definitions must be unique and ordered."""

from unittest.mock import patch

import pytest

from backend.core.access.db import migrations


@pytest.mark.parametrize("versions", [(2, 1), (1, 1)])
def test_invalid_versions_are_rejected(versions: tuple[int, int]) -> None:
    entries = tuple(
        migrations.Migration(version, "test", ("SELECT 1",)) for version in versions
    )
    with patch.object(migrations, "MIGRATIONS", entries), pytest.raises(ValueError):
        migrations.validate_migrations()
