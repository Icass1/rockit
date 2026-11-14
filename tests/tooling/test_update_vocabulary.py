"""Reviewed wording must survive recalculation without disabling Excel translation."""

import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import ModuleType
from xml.etree import ElementTree
from zipfile import ZipFile

ROOT = Path(__file__).parents[2]


def script(name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, ROOT / f"scripts/{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


updater = script("update-vocabulary")
checker = script("check-vocabulary")
reader = script("export-vocabulary-fixture")


def workbook(path: Path) -> None:
    source = (
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<sheetData><row r="2">'
        + "".join(
            f'<c r="{column}2" t="inlineStr"><is><t>{text}</t></is></c>'
            for column, text in zip("ABCD", ["KEY", "en", "es", "fr"])
        )
        + '</row><row r="3"><c r="A3" t="inlineStr"><is><t>LOGS</t></is></c>'
        '<c r="B3" t="inlineStr"><is><t>Logs</t></is></c>'
        '<c r="C3" s="7" t="str"><f>_xlfn.TRANSLATE(B3,$B$2,C$2)</f><v>Troncos</v></c>'
        '<c r="D3" t="str"><f>_xlfn.TRANSLATE(B3,$B$2,D$2)</f></c>'
        "</row></sheetData></worksheet>"
    )
    with ZipFile(path, "w") as archive:
        archive.writestr(updater.SHEET, source)
        archive.writestr("xl/styles.xml", b"untouched styles")


class VocabularyReviewTest(unittest.TestCase):
    def test_reviewed_formula_cache_styles_and_idempotency(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Vocabulary.xlsx"
            workbook(path)
            changes = {"LOGS": {"es": "Logs", "fr": "Logs"}}
            self.assertEqual(updater.update_vocabulary(path, changes), 2)
            with ZipFile(path) as archive:
                sheet = ElementTree.fromstring(archive.read(updater.SHEET))
                cell = sheet.find(".//s:c[@r='C3']", updater.NS)
                self.assertEqual(cell.get("s"), "7")
                self.assertEqual(
                    cell.findtext("s:f", namespaces=updater.NS),
                    'IF(EXACT(B3,"Logs"),"Logs",_xlfn.TRANSLATE(B3,$B$2,C$2))',
                )
                self.assertEqual(archive.read("xl/styles.xml"), b"untouched styles")
            self.assertEqual(reader.read_vocabulary(path)["es"]["LOGS"], "Logs")
            self.assertEqual(checker.check_vocabulary(path), (1, 2))
            before = path.read_bytes()
            self.assertEqual(updater.update_vocabulary(path, changes), 0)
            self.assertEqual(path.read_bytes(), before)
            with self.assertRaises(ValueError):
                updater.update_vocabulary(path, {"MISSING": {"es": "Ausente"}})
            self.assertEqual(path.read_bytes(), before)

    def test_source_edits_reset_review_guard_and_preserve_excel_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Vocabulary.xlsx"
            workbook(path)
            updater.update_vocabulary(path, {"LOGS": {"es": "Logs", "fr": "Logs"}})
            updater.update_vocabulary(
                path,
                {
                    "LOGS": {
                        "en": 'Open "logs" & {count}',
                        "es": 'Abrir "logs" y {count}',
                        "fr": "Ouvrir « logs » et {count}",
                    }
                },
            )
            self.assertEqual(checker.check_vocabulary(path), (1, 2))
            with ZipFile(path) as archive:
                sheet = ElementTree.fromstring(archive.read(updater.SHEET))
                formula = sheet.find(".//s:c[@r='C3']/s:f", updater.NS).text
                self.assertIn('EXACT(B3,"Open ""logs"" & {count}")', formula)
                self.assertEqual(formula.count("TRANSLATE("), 1)

    def test_checker_rejects_missing_caches_context_errors_and_placeholders(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Vocabulary.xlsx"
            workbook(path)
            with self.assertRaisesRegex(ValueError, "tree trunks"):
                checker.check_vocabulary(path)
            updater.update_vocabulary(
                path, {"LOGS": {"en": "Logs {count}", "es": "Logs", "fr": "Logs {count}"}}
            )
            with self.assertRaisesRegex(ValueError, "placeholders"):
                checker.check_vocabulary(path)

    def test_production_workbook_is_complete(self) -> None:
        keys, formulas = checker.check_vocabulary(ROOT / "Vocabulary.xlsx")
        self.assertGreater(keys, 2200)
        self.assertGreater(formulas, 700)
        dictionaries = reader.read_vocabulary(ROOT / "Vocabulary.xlsx")
        for lang in ("en", "es", "fr"):
            self.assertEqual(dictionaries[lang]["LOGS"], "Logs")
        self.assertIn("Repère", dictionaries["fr"]["MOBILE_BOOKMARK_SAVED"])
        self.assertIn("biblioteca", dictionaries["es"]["LIBRARY_SONG_SEARCH_HINT"].lower())


if __name__ == "__main__":
    unittest.main()
