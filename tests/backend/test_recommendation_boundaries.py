import ast
import unittest
from pathlib import Path


class RecommendationBoundaryTests(unittest.TestCase):
    def test_core_recommendations_do_not_import_concrete_integrations(self) -> None:
        core = Path(__file__).resolve().parents[2] / "backend" / "core"
        files = [
            *core.glob("framework/recommendation*.py"),
            *core.glob("framework/externalRecommendation/*.py"),
            core / "framework/provider/baseExternalRecommendationProvider.py",
            core / "access/recommendationAccess.py",
            core / "access/mediaInfoCte.py",
        ]
        for file in files:
            with self.subTest(file=file.relative_to(core)):
                tree = ast.parse(file.read_text())
                for node in ast.walk(tree):
                    modules: list[str] = []
                    if isinstance(node, ast.ImportFrom) and node.module:
                        modules.append(node.module)
                    elif isinstance(node, ast.Import):
                        modules.extend(alias.name for alias in node.names)
                    for module in modules:
                        if module.startswith("backend."):
                            self.assertIn(
                                module.split(".")[1],
                                {"core", "utils", "constants"},
                                f"Core must use provider capabilities, not {module}",
                            )
