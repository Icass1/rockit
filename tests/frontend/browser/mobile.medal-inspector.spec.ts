import { expect, test } from "@playwright/test";
import { listeningProfile } from "../fixtures/listeningProfile";
import { circleFriends } from "../fixtures/socialCircle";

const backend = "http://127.0.0.1:18899";
test("PWA Prism inspection fits a phone and releases its context on close", async ({
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
        data: {
            path: "/friends/levels",
            body: { ...listeningProfile, username: "Fixture listener" },
        },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:13001/friends");
    await page
        .getByTestId("listening-circle")
        .getByRole("button", { name: "Your listening profile" })
        .click();
    const profile = page.getByTestId("listening-profile");
    await expect(profile.getByTestId("medal-stage")).toHaveCount(0);
    const supportsWebGL = await page.evaluate(() => {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl2");
            gl?.getExtension("WEBGL_lose_context")?.loseContext();
            return !!gl;
        } catch {
            return false;
        }
    });
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .first()
        .click();
    const inspector = profile.getByTestId("emblem-inspector");
    if (!supportsWebGL) {
        await expect(inspector.getByRole("status")).toContainText(
            "3D is unavailable"
        );
        await expect(profile.locator("canvas")).toHaveCount(0);
        return;
    }
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 15000 });
    await expect(inspector.locator("canvas")).toHaveCount(1);
    const bounds = await inspector.getByTestId("medal-stage").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    await inspector.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath("prism-mobile-front.png") });
    await inspector
        .getByRole("button", { name: "Reverse", exact: true })
        .click();
    await page.screenshot({
        path: info.outputPath("prism-mobile-reverse.png"),
    });
    await inspector.getByTestId("medal-stage").focus();
    await page.keyboard.press("ArrowRight");
    await inspector
        .getByRole("button", { name: "Close 3D view", exact: true })
        .click();
    await expect(profile.locator("canvas")).toHaveCount(0);
    await profile
        .getByRole("button", { name: "Inspect in 3D", exact: true })
        .click();
    await expect(profile.locator("canvas")).toHaveCount(1);
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 15000 });
    await inspector
        .locator("canvas")
        .evaluate((canvas) =>
            canvas.dispatchEvent(
                new Event("webglcontextlost", { cancelable: true })
            )
        );
    await expect(inspector.getByRole("status")).toContainText(
        "3D is unavailable"
    );
    await expect(profile.locator("canvas")).toHaveCount(0);
});
