import { test } from "@playwright/test";
import { inspectPlayerAppearance } from "./playerAppearanceFlow";

test("desktop shares the filled like hand and hides its one-user presence indicator", async ({
    page,
    request,
    context,
}, info) => {
    await inspectPlayerAppearance(page, request, context, info, false);
});
