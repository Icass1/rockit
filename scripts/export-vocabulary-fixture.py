"""Read actual cached workbook translations for isolated frontend fixtures."""

import argparse
import json
import re
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile


def read_vocabulary(workbook: Path) -> dict[str, dict[str, str]]:
    namespace = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
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
            inline = cell.find("s:is", namespace)
            return "".join(inline.itertext()) if inline is not None else ""
        cached = cell.find("s:v", namespace)
        text = cached.text if cached is not None else ""
        if cell.get("t") == "e":
            return ""
        return shared[int(text)] if cell.get("t") == "s" and text else text or ""

    rows = sheet.findall("s:sheetData/s:row", namespace)
    header = next(row for row in rows if row.get("r") == "2")
    languages = {
        re.sub(pattern=r"\d", repl="", string=cell.get("r", "")): value(cell) for cell in header
    }
    languages.pop("A", None)
    result = {lang: {} for lang in languages.values()}
    for row in rows:
        cells = {
            re.sub(pattern=r"\d", repl="", string=cell.get("r", "")): value(cell) for cell in row
        }
        key = cells.get("A", "")
        if int(row.get("r", "0")) <= 2 or not re.fullmatch(pattern=r"[A-Z][A-Z0-9_]*", string=key):
            continue
        for column, lang in languages.items():
            if cells.get(column, "").strip():
                result[lang][key] = cells[column]
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=Path("Vocabulary.xlsx"))
    args = parser.parse_args()
    print(json.dumps(obj=read_vocabulary(args.workbook), ensure_ascii=False))
