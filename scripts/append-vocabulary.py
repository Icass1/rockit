"""Append fully translated vocabulary without rewriting cached Excel formulas."""

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


def append_vocabulary(workbook: Path, entries: dict[str, dict[str, str]]) -> list[str]:
    """Keep existing XML/ZIP members byte-for-byte, including formula caches."""
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
                return "".join(cell.find("s:is", NS).itertext())
            child = cell.find("s:v", NS)
            text = child.text if child is not None else ""
            return shared[int(text)] if cell.get("t") == "s" and text else text or ""

        rows = sheet.findall("s:sheetData/s:row", NS)
        header = next(row for row in rows if row.get("r") == "2")
        languages = {re.sub(r"\d", "", cell.get("r", "")): value(cell) for cell in header}
        languages.pop("A", None)
        if not languages or len(set(languages.values())) != len(languages):
            raise ValueError("Workbook language header is invalid")
        known = {value(row.find("s:c", NS)) for row in rows if row.find("s:c", NS) is not None}
        last = max(int(row.get("r", "0")) for row in rows)
        added = []
        fragments = []
        for key, translations in entries.items():
            if key in known:
                continue
            if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
                raise ValueError(f"Invalid vocabulary key: {key}")
            if set(translations) != set(languages.values()) or not all(
                isinstance(v, str) and v.strip() for v in translations.values()
            ):
                raise ValueError(f"Every workbook language needs a translation: {key}")
            last += 1
            cells = {"A": key, **{column: translations[lang] for column, lang in languages.items()}}
            fragments.append(
                f'<row r="{last}">'
                + "".join(
                    f'<c r="{column}{last}" t="inlineStr"><is><t xml:space="preserve">'
                    f"{escape(text)}</t></is></c>"
                    for column, text in cells.items()
                )
                + "</row>"
            )
            added.append(key)
            known.add(key)
        if not added:
            return []
        source = source.replace("</sheetData>", "".join(fragments) + "</sheetData>")
        source = re.sub(
            r'(<dimension ref="[A-Z]+\d+:[A-Z]+)\d+("\s*/>)',
            lambda match: match[1] + str(last) + match[2],
            source,
        )
        output = io.BytesIO()
        with ZipFile(output, "w") as target:
            for member in archive.infolist():
                data = archive.read(member.filename)
                if member.filename == SHEET:
                    data = source.encode("utf-8")
                elif member.filename.startswith("xl/tables/") and member.filename.endswith(".xml"):
                    text = data.decode("utf-8")
                    text = re.sub(
                        r'(ref="A2:[A-Z]+)\d+(\")',
                        lambda match: match[1] + str(last) + match[2],
                        text,
                    )
                    data = text.encode("utf-8")
                target.writestr(member, data)
    temporary = workbook.with_suffix(".tmp.xlsx")
    temporary.write_bytes(output.getvalue())
    temporary.replace(workbook)
    return added


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("translations", type=Path)
    parser.add_argument("--workbook", type=Path, default=Path("Vocabulary.xlsx"))
    args = parser.parse_args()
    print(
        "Added: "
        + ", ".join(append_vocabulary(args.workbook, json.loads(args.translations.read_text())))
    )
