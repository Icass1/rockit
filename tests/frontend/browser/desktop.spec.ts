import { expect, test } from "@playwright/test";

const desktop = "http://127.0.0.1:13000",
    backend = "http://127.0.0.1:18899";
test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});
test.afterEach(async ({ request }, info) => {
    const result = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    await info.attach("mock-backend-requests-and-timings", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
    });
    expect(result.unhandled).toEqual([]);
    expect(result.protocolErrors).toEqual([]);
});
test("desktop server rendering forwards its cookie and keeps the desktop player at short viewport heights", async ({
    page,
    request,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 450 });
    await page.goto(desktop + "/library");
    await expect(
        page.getByText("Fixture Album", { exact: true }).first()
    ).toBeVisible();
    await page
        .getByPlaceholder("Search in Library")
        .filter({ visible: true })
        .fill("Playlist exclusive");
    await expect(
        page.getByText("Playlist exclusive", { exact: true }).first()
    ).toBeVisible();
    await page.getByText("Playlist exclusive", { exact: true }).first().click();
    await expect
        .poll(
            async () =>
                (
                    await (
                        await request.get(backend + "/user/queue", {
                            headers: { Cookie: "session_id=fixture" },
                        })
                    ).json()
                ).total
        )
        .toBe(1);
    expect(await page.locator("#main-scroll-container").count()).toBe(1);
    expect(errors).toEqual([]);
});
