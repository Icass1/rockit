import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
import { inlineVocabularyIssues } from "../../scripts/lib/ui-vocabulary.mjs";

const inspect = (source) =>
    inlineVocabularyIssues(
        ts.createSourceFile(
            "copy.tsx",
            source,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX
        ),
        new Set(["QUEUE"])
    );
test("finds conditional, interpolated, config and accessible copy", () => {
    const issues = inspect(
        'const options = [{label: "Grid view"}]; <button aria-label={playing ? "Pause song" : "Play song"}>{`Cover of ${name}`}</button>'
    );
    assert.deepEqual(
        issues.map((issue) => issue.text),
        ["Grid view", "Pause song", "Play song", "Cover of"]
    );
});
test("finds error notifications and hardcoded formatting languages", () => {
    const issues = inspect(
        'manager.notifyError("Storage full"); Alert.alert("Try again"); new Intl.NumberFormat("es"); date.toLocaleDateString(lang || "en");'
    );
    assert.equal(issues.length, 4);
    assert.equal(
        issues.filter((issue) => issue.reason.startsWith("Use the selected"))
            .length,
        2
    );
});
test("keeps styles, action IDs, vocabulary keys, brands and log levels as data", () => {
    assert.deepEqual(
        inspect(
            '<><style jsx>{`.wave { animation: pulse 1s }`}</style><script>{"internal code"}</script><button onClick={() => move("increment")}>{v.QUEUE}</button><span>RockIt!</span></>; const config = [{label: "QUEUE"}, {label: "DEBUG"}];'
        ),
        []
    );
});
test("accepts selected-language formatters and vocabulary notifications", () => {
    assert.deepEqual(
        inspect(
            'new Intl.NumberFormat(lang); date.toLocaleString(locale); manager.notifyError(v.QUEUE); <img alt={v.COVER_OF.replace("{name}", name)} />'
        ),
        []
    );
});
