import { test } from "@playwright/test";
import { inspectPlayerAppearance } from "./playerAppearanceFlow";

test("mobile likes use a solid white hand with a finite fire burst and hide lone listeners", async ({
    page,
    request,
    context,
}, info) => {
    await inspectPlayerAppearance(page, request, context, info, true);
});
