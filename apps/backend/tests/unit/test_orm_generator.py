"""ORM constructors support both explicit and inherited primary keys."""

import ast
from pathlib import Path

import pytest

from core.utils import addInit


@pytest.mark.parametrize("inherited", [False, True])
def test_constructor_has_exactly_one_primary_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    inherited: bool,
) -> None:
    folder = tmp_path / "core/access/db/ormModels"
    folder.mkdir(parents=True)
    path = folder / "example.py"
    base = "Base, TableAutoincrementId" if inherited else "Base"
    key = "" if inherited else "    id: Mapped[str] = mapped_column(String, primary_key=True)\n"
    path.write_text(
        f"class Example({base}):\n{key}"
        "    value: Mapped[str] = mapped_column(String, nullable=False)\n"
    )

    def validate_source(content: str, file_path: str) -> str:
        compile(content, file_path, "exec")
        return content

    monkeypatch.setattr(addInit, "BACKEND_ROOT", tmp_path)
    monkeypatch.setattr(addInit, "format_with_ruff", validate_source)
    addInit.add_init_to_orm()
    source = path.read_text()
    constructor = next(
        node
        for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.FunctionDef) and node.name == "__init__"
    )
    names = [argument.arg for argument in constructor.args.args]
    assert names.count("id") == 1
    if inherited:
        assert ast.unparse(constructor.args.defaults[-1]) == "None"
    else:
        assert not constructor.args.defaults
    addInit.add_init_to_orm()
    assert path.read_text() == source
