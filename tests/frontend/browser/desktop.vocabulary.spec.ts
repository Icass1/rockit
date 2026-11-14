import { test } from "@playwright/test";
import { inspectVocabulary } from "./vocabularyFlow";

for (const lang of ["en", "es", "fr"] as const) {
    test(`desktop uses the reviewed ${lang} dictionary and locale`, async ({
        page,
        request,
        context,
    }, info) => {
        await inspectVocabulary(page, request, context, info, "desktop", lang);
    });
}
