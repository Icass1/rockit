import { test } from "@playwright/test";
import { inspectVocabulary } from "./vocabularyFlow";

for (const lang of ["en", "es", "fr"] as const) {
    test(`mobile PWA uses the reviewed ${lang} dictionary and locale`, async ({
        page,
        request,
        context,
    }, info) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await inspectVocabulary(page, request, context, info, "mobile", lang);
    });
}
