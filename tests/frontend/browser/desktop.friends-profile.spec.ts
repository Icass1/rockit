import { expect, test } from "@playwright/test";
import { listeningProfile } from "../fixtures/listeningProfile";
import { circleFriends } from "../fixtures/socialCircle";

const backend = "http://127.0.0.1:18899";
test("desktop circle opens a focused, dismissible listening passport and the original emblem collection", async ({
    page,
    request,
    context,
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
    await page.goto("http://127.0.0.1:13000/friends");
    const circle = page.getByTestId("listening-circle");
    await circle
        .getByRole("button", { name: "View Sam in your listening circle" })
        .click();
    const open = circle.getByRole("button", { name: "View Sam's profile" });
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("50.6", { exact: true })).toBeVisible();
    await expect(
        dialog.getByText("4 of 12 earned", { exact: true })
    ).toBeVisible();
    await page.screenshot({
        path: info.outputPath("friends-desktop-profile.png"),
    });
    await dialog
        .getByRole("button", { name: "Explore all 12 emblems" })
        .click();
    await dialog
        .getByTestId("profile-emblems")
        .getByRole("button")
        .nth(4)
        .click();
    await dialog.getByTestId("profile-emblem-detail").scrollIntoViewIfNeeded();
    await page.screenshot({
        path: info.outputPath("friends-desktop-emblem-catalog.png"),
    });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(open).toBeFocused();
    await page
        .locator("#social-circle")
        .getByRole("button", { name: "View Sam's profile" })
        .click();
    await expect(
        page.getByRole("dialog").getByText("Sam", { exact: true })
    ).toBeVisible();
});
