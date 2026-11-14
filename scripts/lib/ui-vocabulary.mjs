import ts from "typescript";

// Brands, media formats and notation are data, not translatable interface copy.
const data = new Set([
    "RockIt!",
    "RockIt",
    "RockIt! v",
    "MP4 · WEBM · MKV · AVI · MOV",
    "MB",
    "LRC",
    "LIB",
    "DEBUG",
    "LOG",
    "INFO",
    "WARN",
    "ERROR",
]);
const labels = new Set([
    "label",
    "title",
    "placeholder",
    "alt",
    "accessibilityLabel",
    "accessibilityHint",
    "aria-label",
    "aria-description",
    "emptyMessage",
    "errorMessage",
    "helperText",
]);

function literals(node) {
    if (!node) return [];
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) return [node];
    if (ts.isJsxExpression(node) || ts.isParenthesizedExpression(node))
        return literals(node.expression);
    if (ts.isConditionalExpression(node))
        return [...literals(node.whenTrue), ...literals(node.whenFalse)];
    if (
        ts.isBinaryExpression(node) &&
        [
            ts.SyntaxKind.BarBarToken,
            ts.SyntaxKind.QuestionQuestionToken,
            ts.SyntaxKind.PlusToken,
        ].includes(node.operatorToken.kind)
    )
        return [...literals(node.left), ...literals(node.right)];
    if (ts.isTemplateExpression(node))
        return [
            node.head,
            ...node.templateSpans.flatMap((span) => [span.literal]),
        ];
    if (ts.isArrayLiteralExpression(node))
        return node.elements.flatMap(literals);
    return [];
}

/** Inspect copy positions, not internal action IDs, styles, imports or diagnostics. */
export function inlineVocabularyIssues(ast, vocabularyKeys = new Set()) {
    const issues = [];
    const seen = new Set();
    const report = (node, reason) => {
        const text = node.text
            .trim()
            .replace(/&(?:[a-z]+|#\d+);/gi, "")
            .trim();
        if (!/[\p{L}]{2}/u.test(text) || data.has(text) || seen.has(node.pos))
            return;
        seen.add(node.pos);
        issues.push({
            line:
                ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
            text,
            reason,
        });
    };
    const copy = (node) =>
        literals(node).forEach((literal) =>
            report(literal, "UI copy must come from Vocabulary.xlsx")
        );
    function visit(node) {
        if (
            ts.isJsxElement(node) &&
            ["style", "script"].includes(
                node.openingElement.tagName.getText(ast)
            )
        )
            return;
        if (ts.isJsxText(node)) copy(node);
        if (
            ts.isPropertyAssignment(node) &&
            labels.has(node.name.getText(ast).replace(/^['"]|['"]$/g, "")) &&
            !(
                ts.isStringLiteralLike(node.initializer) &&
                vocabularyKeys.has(node.initializer.text)
            )
        )
            copy(node.initializer);
        if (ts.isJsxAttribute(node) && labels.has(node.name.getText(ast)))
            copy(node.initializer);
        if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent))
            copy(node.expression);
        if (ts.isCallExpression(node)) {
            const callee = node.expression.getText(ast);
            if (
                /\.(notify(?:Error|Warn|Success|Info|InfoFast)|alert)$/.test(
                    callee
                ) ||
                /^(?:toast|toaster)\.(?:error|success|info|warning)$/.test(
                    callee
                )
            )
                node.arguments.forEach(copy);
            if (
                /\.(?:toLocale(?:Date|Time)?String|toLocaleLowerCase|toLocaleUpperCase)$/.test(
                    callee
                )
            ) {
                for (const item of literals(node.arguments[0]))
                    if (
                        /^(?:[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*|default)$/.test(
                            item.text
                        )
                    )
                        report(
                            item,
                            "Use the selected vocabulary language for formatting"
                        );
            }
        }
        if (
            ts.isNewExpression(node) &&
            /^Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat|ListFormat|PluralRules)$/.test(
                node.expression.getText(ast)
            )
        ) {
            for (const item of literals(node.arguments?.[0]))
                if (
                    /^(?:[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*|default)$/.test(
                        item.text
                    )
                )
                    report(
                        item,
                        "Use the selected vocabulary language for formatting"
                    );
        }
        ts.forEachChild(node, visit);
    }
    visit(ast);
    return issues;
}
