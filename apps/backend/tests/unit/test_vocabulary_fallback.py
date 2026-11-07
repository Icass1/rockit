"""The first-render fallback must match the authoritative translated workbook."""

import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[4]


def test_english_fallback_matches_the_workbook() -> None:
    workbook = openpyxl.load_workbook(ROOT / "Vocabulary.xlsx", data_only=True, read_only=True)
    try:
        sheet = workbook.active
        assert sheet is not None
        expected = {
            str(row[0]): str(row[1])
            for row in sheet.iter_rows(min_row=3, values_only=True)
            if row[0] and row[1]
        }
    finally:
        workbook.close()
    actual = json.loads((ROOT / "packages/shared/src/i18n/en.json").read_text())
    assert actual == expected
    assert all(text.strip() for text in actual.values())
