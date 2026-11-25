import { expect, test } from "@playwright/test";
import { listeningProfile } from "../fixtures/listeningProfile";
import { circleFriends } from "../fixtures/socialCircle";

const web = "http://127.0.0.1:13000",
    backend = "http://127.0.0.1:18899";
test("desktop keeps round orbits and the directory accessible beside the circle", async ({
    page,
    context,
    request,
}, info) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: circleFriends } },
    });
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends/circle-sam/level", body: listeningProfile },
    });
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/listen-together/invite",
            body: { status: "OK" },
        },
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(web + "/friends");
    const circle = page.getByTestId("listening-circle");
    const directory = page.locator("#social-circle");
    const sam = circle.getByRole("button", {
        name: "View Sam's profile",
    });
    await expect(sam).toBeVisible();
    const circleBox = (await circle.boundingBox())!;
    const directoryBox = (await directory.boundingBox())!;
    expect(directoryBox.x).toBeGreaterThan(circleBox.x + circleBox.width);
    await expect
        .poll(async () => {
            const stage = await circle
                .getByTestId("listening-circle-stage")
                .boundingBox();
            return stage && Math.abs(stage.width - stage.height);
        })
        .toBe(0);
    await sam.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("listening-profile")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(circle.getByTestId("listening-circle-detail")).toContainText(
        "Everything In Its Right Place"
    );
    await page.screenshot({
        path: info.outputPath("friends-desktop-circle.png"),
    });
    await page.getByRole("button", { name: "Search Users" }).click();
    await expect(directory.locator("input")).toBeFocused();
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
});
