"""Validate every workbook language, cached formula result and runtime placeholder."""

import argparse
import re
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
PLACEHOLDER = re.compile(r"\{([A-Za-z_][A-Za-z_0-9]*)\}")


def check_vocabulary(workbook: Path) -> tuple[int, int]:
    with ZipFile(workbook) as archive:
        shared = (
            [
                "".join(item.itertext())
                for item in ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            ]
            if "xl/sharedStrings.xml" in archive.namelist()
            else []
        )
        sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))

    def value(cell: ElementTree.Element) -> str:
        if cell.get("t") == "inlineStr":
            inline = cell.find("s:is", NS)
            return "".join(inline.itertext()) if inline is not None else ""
        text = cell.findtext("s:v", default="", namespaces=NS)
        return shared[int(text)] if cell.get("t") == "s" and text else text

    rows = sheet.findall("s:sheetData/s:row", NS)
    header = next(row for row in rows if row.get("r") == "2")
    languages = {re.sub(r"\d", "", cell.get("r", "")): value(cell) for cell in header}
    languages.pop("A", None)
    if set(languages.values()) != {"en", "es", "fr"} or len(languages) != 3:
        raise ValueError("Expected exactly one English, Spanish and French column")
    english_column = next(col for col, lang in languages.items() if lang == "en")
    keys = set()
    formulas = 0
    errors = []
    for row in rows:
        if int(row.get("r", "0")) <= 2:
            continue
        cells = {re.sub(r"\d", "", cell.get("r", "")): cell for cell in row}
        if "A" not in cells or not value(cells["A"]).strip():
            continue
        key = value(cells["A"])
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key) or key in keys:
            errors.append(f"Invalid or duplicate key: {key}")
        keys.add(key)
        source = value(cells[english_column]) if english_column in cells else ""
        placeholders = Counter(PLACEHOLDER.findall(source))
        for col, lang in languages.items():
            cell = cells.get(col)
            text = value(cell) if cell is not None else ""
            if cell is not None and cell.find("s:f", NS) is not None:
                formulas += 1
            if not text.strip() or (cell is not None and cell.get("t") == "e"):
                errors.append(
                    f"{key}/{lang}: empty translation or Excel error "
                    "(formula results must be cached)"
                )
            elif Counter(PLACEHOLDER.findall(text)) != placeholders:
                errors.append(f"{key}/{lang}: placeholders differ from English")
            if "LOG" in key and lang == "es" and re.search(r"\btroncos?\b", text, re.I):
                errors.append(f"{key}/{lang}: software logs must not be translated as tree trunks")
    if errors:
        raise ValueError("\n".join(errors))
    return len(keys), formulas


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=Path("Vocabulary.xlsx"))
    args = parser.parse_args()
    keys, formulas = check_vocabulary(args.workbook)
    print(
        f"Vocabulary: {keys} keys × 3 languages, {formulas} cached formulas; "
        "placeholders and terminology passed."
    )
