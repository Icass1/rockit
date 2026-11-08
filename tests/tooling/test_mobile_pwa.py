"""PWA preparation must produce stable versions and invalidate changed assets."""

import subprocess
import tempfile
import unittest
from pathlib import Path


class MobilePwaBuildTest(unittest.TestCase):
    def test_repeatable_shell_and_changed_asset_version(self) -> None:
        root = Path(__file__).parents[2]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / "index.html").write_text(
                data='<html><head></head><body><script src="/entry.js"></script></body></html>',
                encoding="utf-8",
            )
            entry = output / "entry.js"
            entry.write_text(data="/* first revision */", encoding="utf-8")

            def prepare() -> bytes:
                subprocess.run(
                    args=["node", str(root / "scripts/prepare-mobile-pwa.mjs"), str(output)],
                    capture_output=True,
                    check=True,
                )
                return (output / "sw.js").read_bytes()

            first = prepare()
            self.assertEqual(first, prepare())
            self.assertEqual((output / "index.html").read_text().count('rel="manifest"'), 1)
            entry.write_text(data="/* changed revision */", encoding="utf-8")
            self.assertNotEqual(first, prepare())


if __name__ == "__main__":
    unittest.main()
