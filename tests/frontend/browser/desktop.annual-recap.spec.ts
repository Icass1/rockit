import { expect, test } from "@playwright/test";
import { inspectRecap, prepareRecap } from "./annualRecapFlow";

const backend = "http://127.0.0.1:18899";
test("desktop centers the shared portrait recap and supports the keyboard", async ({
    page,
    context,
    request,
}, info) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await prepareRecap(request);
    await page.goto("http://127.0.0.1:13000/friends");
    await inspectRecap(page, info, "desktop");
    await expect(
        page
            .getByTestId("listening-circle")
            .getByRole("button", { name: "Your listening profile" })
    ).toBeFocused();
});
