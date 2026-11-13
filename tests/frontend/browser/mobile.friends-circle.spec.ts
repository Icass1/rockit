import { expect, test } from "@playwright/test";
import { circleFriends } from "../fixtures/socialCircle";

const mobile = "http://127.0.0.1:13001",
    backend = "http://127.0.0.1:18899";
test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});
test("the mobile listening circle selects friends before inviting and retains social navigation", async ({
    page,
    request,
}, info) => {
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: circleFriends } },
    });
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/listen-together/invite",
            body: { status: "OK" },
        },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(mobile + "/friends");
    const circle = page.getByTestId("listening-circle");
    await expect(
        circle.getByRole("button", {
            name: /^View .* in your listening circle$/,
        })
    ).toHaveCount(6);
    await expect(page.getByRole("tab")).toHaveCount(4);
    await page.screenshot({
        path: info.outputPath("friends-mobile-circle.png"),
    });
    await circle
        .getByRole("button", { name: "View Sam in your listening circle" })
        .click();
    await expect(circle.getByTestId("listening-circle-detail")).toContainText(
        "Everything In Its Right Place"
    );
    const calls = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    expect(
        calls.calls.filter(
            (call: { path: string }) =>
                call.path === "/friends/listen-together/invite"
        )
    ).toHaveLength(0);
    await page.screenshot({
        path: info.outputPath("friends-mobile-selected.png"),
    });
    for (const width of [320, 768]) {
        await page.setViewportSize({ width, height: 1024 });
        await expect
            .poll(() =>
                page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth
                )
            )
            .toBe(true);
        const stage = circle.getByTestId("listening-circle-stage");
        const detail = circle.getByTestId("listening-circle-detail");
        await expect
            .poll(async () => {
                const a = (await stage.boundingBox())!;
                const b = (await detail.boundingBox())!;
                return width < 768
                    ? b.y >= a.y + a.height
                    : b.x >= a.x + a.width;
            })
            .toBe(true);
        await expect(detail).toContainText("Everything In Its Right Place");
        await page.screenshot({
            path: info.outputPath(`friends-${width}-circle.png`),
        });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const invite = page.waitForRequest(
        (request) =>
            request.url().endsWith("/friends/listen-together/invite") &&
            request.method() === "POST"
    );
    await circle
        .getByRole("button", { name: "Invite Sam to listen together" })
        .click();
    expect((await invite).postDataJSON()).toEqual({
        userPublicId: "circle-sam",
    });
    await expect(
        page.getByRole("tab", { name: "Listen together", exact: true })
    ).toHaveAttribute("aria-selected", "true");
});
test("an empty mobile circle opens friend search without an invitation", async ({
    page,
    request,
}, info) => {
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: [] } },
    });
    await page.goto(mobile + "/friends");
    await expect(page.getByTestId("listening-circle")).toBeVisible();
    await expect(
        page.locator('[data-testid^="listening-circle-person-"]')
    ).toHaveCount(0);
    await page.screenshot({
        path: info.outputPath("friends-mobile-empty.png"),
    });
    await page
        .getByRole("button", { name: "Find and manage friends", exact: true })
        .click();
    await expect(page.getByRole("textbox").first()).toBeFocused();
});
