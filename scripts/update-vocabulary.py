"""Apply context-reviewed translations without discarding Excel formulas or caches."""

import argparse
import io
import json
import re
from pathlib import Path
from xml.etree import ElementTree
from xml.sax.saxutils import escape
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SHEET = "xl/worksheets/sheet1.xml"


def update_vocabulary(workbook: Path, changes: dict[str, dict[str, str]]) -> int:
    """Keep all untouched ZIP members/cells; reviewed formulas still translate new English."""
    original = workbook.read_bytes()
    with ZipFile(io.BytesIO(original)) as archive:
        source = archive.read(SHEET).decode("utf-8")
        sheet = ElementTree.fromstring(source)
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = [
                "".join(item.itertext())
                for item in ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            ]

        def value(cell: ElementTree.Element) -> str:
            if cell.get("t") == "inlineStr":
                inline = cell.find("s:is", NS)
                return "".join(inline.itertext()) if inline is not None else ""
            cached = cell.find("s:v", NS)
            text = cached.text if cached is not None else ""
            return shared[int(text)] if cell.get("t") == "s" and text else text or ""

        rows = sheet.findall("s:sheetData/s:row", NS)
        header = next(row for row in rows if row.get("r") == "2")
        languages = {re.sub(r"\d", "", c.get("r", "")): value(c) for c in header}
        languages.pop("A", None)
        known = {value(row.find("s:c", NS)): row for row in rows if row.find("s:c", NS) is not None}
        if missing := changes.keys() - known.keys():
            raise ValueError(f"Unknown vocabulary keys: {sorted(missing)}")
        count = 0
        for key, translations in changes.items():
            if not translations or translations.keys() - set(languages.values()):
                raise ValueError(f"Unknown language in {key}")
            if not all(isinstance(text, str) and text.strip() for text in translations.values()):
                raise ValueError(f"Empty translation for {key}")
            row = known[key]
            cells = {re.sub(r"\d", "", c.get("r", "")): c for c in row}
            english_column = next(column for column, lang in languages.items() if lang == "en")
            english = translations.get("en", value(cells[english_column]))
            for column, lang in languages.items():
                if lang not in translations:
                    continue
                text = translations[lang]
                address = f"{column}{row.get('r')}"
                cell = cells.get(column)
                if cell is None:
                    raise ValueError(f"Missing cell {address}")
                old = re.search(rf'<c\b[^>]*\br="{address}"[^>]*(?:/>|>.*?</c>)', source, re.S)
                if old is None:
                    raise ValueError(f"Cannot locate {address}")
                opening = re.sub(r'\s+t="[^"]*"', "", old[0].split(">", 1)[0].rstrip("/"))
                formula = cell.find("s:f", NS)
                if formula is not None:
                    # An exact source match keeps this reviewed wording stable. Editing
                    # English in Excel falls through to the original automatic translator.
                    original_formula = formula.text or ""
                    fallback = re.search(r"_xlfn\.TRANSLATE\([^()]*\)", original_formula)
                    if fallback is None:
                        raise ValueError(f"Unsupported translation formula at {address}")

                    def quote(part: str) -> str:
                        return '"' + part.replace('"', '""') + '"'

                    reviewed = (
                        f"IF(EXACT({english_column}{row.get('r')},{quote(english)}),"
                        f"{quote(text)},{fallback[0]})"
                    )
                    new = f'{opening} t="str"><f>{escape(reviewed)}</f><v>{escape(text)}</v></c>'
                else:
                    new = (
                        f'{opening} t="inlineStr"><is><t xml:space="preserve">'
                        f"{escape(text)}</t></is></c>"
                    )
                source = source[: old.start()] + new + source[old.end() :]
                count += old[0] != new
        output = io.BytesIO()
        with ZipFile(output, "w") as target:
            for member in archive.infolist():
                target.writestr(
                    member,
                    source.encode("utf-8")
                    if member.filename == SHEET
                    else archive.read(member.filename),
                )
    if count:
        temporary = workbook.with_suffix(".reviewed.xlsx")
        temporary.write_bytes(output.getvalue())
        temporary.replace(workbook)
    return count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("changes", type=Path)
    parser.add_argument("--workbook", type=Path, default=Path("Vocabulary.xlsx"))
    args = parser.parse_args()
    changes = json.loads(args.changes.read_text())
    print(
        f"Updated {update_vocabulary(args.workbook, changes)} vocabulary cells; "
        "Excel translation formulas retained."
    )
