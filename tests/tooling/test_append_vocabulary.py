"""Workbook edits must preserve cached translations and existing ZIP members."""

import importlib.util
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location(
    "vocabulary", Path(__file__).parents[2] / "scripts/append-vocabulary.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class VocabularyAppendTest(unittest.TestCase):
    def test_preserves_formulas_cached_values_and_idempotency(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Vocabulary.xlsx"
            source = (
                '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                '<dimension ref="A2:D3"/><sheetData><row r="2">'
                + "".join(
                    f'<c r="{column}2" t="inlineStr"><is><t>{value}</t></is></c>'
                    for column, value in zip("ABCD", ["KEY", "en", "es", "fr"])
                )
                + '</row><row r="3"><c r="A3" t="inlineStr"><is><t>OLD</t></is></c>'
                '<c r="B3" t="str"><f>TRANSLATE(C3)</f><v>cached translation</v></c>'
                "</row></sheetData></worksheet>"
            )
            with ZipFile(path, "w") as archive:
                archive.writestr(module.SHEET, source)
                archive.writestr("xl/sharedStrings.xml", "<sst/>")
            entries = {"NEW": {"en": "Listen & play", "es": "Canción", "fr": "Écouter"}}
            self.assertEqual(module.append_vocabulary(path, entries), ["NEW"])
            with ZipFile(path) as archive:
                updated = archive.read(module.SHEET).decode()
                self.assertIn("<f>TRANSLATE(C3)</f><v>cached translation</v>", updated)
                self.assertIn("Listen &amp; play", updated)
                self.assertIn("A2:D4", updated)
                self.assertEqual(archive.read("xl/sharedStrings.xml"), b"<sst/>")
            before = path.read_bytes()
            self.assertEqual(module.append_vocabulary(path, entries), [])
            self.assertEqual(before, path.read_bytes())
            with self.assertRaises(ValueError):
                module.append_vocabulary(path, {"INCOMPLETE": {"en": "Missing"}})
            self.assertEqual(before, path.read_bytes())


if __name__ == "__main__":
    unittest.main()
