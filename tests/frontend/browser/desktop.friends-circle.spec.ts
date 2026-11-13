import { expect, test } from "@playwright/test";
import { circleFriends } from "../fixtures/socialCircle";

const web = "http://127.0.0.1:13000",
    backend = "http://127.0.0.1:18899";
test("desktop uses the shared circle with explicit invitations and keeps the directory", async ({
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
        data: {
            path: "/friends/listen-together/invite",
            body: { status: "OK" },
        },
    });
    await page.goto(web + "/friends");
    const circle = page.getByTestId("listening-circle");
    const sam = circle.getByRole("button", {
        name: "View Sam in your listening circle",
    });
    await expect(sam).toBeVisible();
    await sam.focus();
    await page.keyboard.press("Enter");
    await expect(circle.getByTestId("listening-circle-detail")).toContainText(
        "Everything In Its Right Place"
    );
    await expect(page.locator("#social-circle")).toBeAttached();
    await page.screenshot({
        path: info.outputPath("friends-desktop-circle.png"),
    });
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
