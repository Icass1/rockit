import { expect, test } from "@playwright/test";

const backend = "http://127.0.0.1:18899",
    mobile = "http://127.0.0.1:13001";
test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});
async function openPlayer(page: import("@playwright/test").Page) {
    await page.goto(mobile + "/library");
    await page.getByPlaceholder(/search.*library/i).fill("Playlist exclusive");
    await page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .first()
        .click();
    await expect(
        page.getByRole("button", { name: "Pause", exact: true }).first()
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .last()
        .click();
}
const angle = (page: import("@playwright/test").Page) =>
    page
        .getByTestId("player-vinyl-disc")
        .first()
        .evaluate((element) => getComputedStyle(element).transform);
test("PWA restores vinyl, rotates only during playback, and retains the mode after closing", async ({
    page,
    request,
}, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page);
    await page
        .getByRole("button", { name: "Vinyl record", exact: true })
        .click();
    await expect(page.getByTestId("player-vinyl")).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Square cover", exact: true })
    ).toBeVisible();
    const initial = await angle(page);
    await expect.poll(() => angle(page)).not.toBe(initial);
    const callsBefore = (
        await (await request.get(backend + "/__fixture/calls")).json()
    ).calls;
    await page
        .getByRole("button", { name: "Pause", exact: true })
        .last()
        .click();
    await page.waitForTimeout(2200); // The motor coasts before stopping, independently of the audio.
    const stopped = await angle(page);
    await page.waitForTimeout(150);
    expect(await angle(page)).toBe(stopped);
    await page.screenshot({ path: info.outputPath("mobile-vinyl.png") });
    await page
        .getByRole("button", { name: "Play", exact: true })
        .last()
        .click();
    await expect.poll(() => angle(page)).not.toBe(stopped);
    await page
        .getByRole("button", { name: "Enter fullscreen", exact: true })
        .click();
    await expect(page.getByTestId("player-vinyl")).toHaveCount(2);
    const fullscreenDisc = page.getByTestId("player-vinyl-disc").last();
    const fullscreenAngle = await fullscreenDisc.evaluate(
        (element) => getComputedStyle(element).transform
    );
    await expect
        .poll(() =>
            fullscreenDisc.evaluate(
                (element) => getComputedStyle(element).transform
            )
        )
        .not.toBe(fullscreenAngle);
    const hiddenAngle = await angle(page);
    await page.waitForTimeout(120);
    expect(await angle(page)).toBe(hiddenAngle);
    await page
        .getByRole("button", { name: "Exit fullscreen", exact: true })
        .click();
    await expect(page.getByTestId("player-vinyl")).toHaveCount(1);
    await page
        .getByRole("button", { name: "Close", exact: true })
        .last()
        .click();
    await expect(page.getByTestId("player-vinyl")).toHaveCount(0);
    await page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .last()
        .click();
    await expect(page.getByTestId("player-vinyl")).toBeVisible();
    for (const viewport of [
        { width: 320, height: 667 },
        { width: 844, height: 390 },
        { width: 768, height: 1024 },
    ]) {
        await page.setViewportSize(viewport);
        await expect
            .poll(async () => {
                const r = await page.getByTestId("player-vinyl").boundingBox();
                return (
                    !!r &&
                    r.x >= 0 &&
                    r.x + r.width <= viewport.width + 1 &&
                    r.y >= 0 &&
                    r.y + r.height <= viewport.height + 1
                );
            })
            .toBe(true);
    }
    await page
        .getByRole("button", { name: "Square cover", exact: true })
        .click();
    await expect(page.getByTestId("player-vinyl")).toHaveCount(0);
    const callsAfter = (
        await (await request.get(backend + "/__fixture/calls")).json()
    ).calls;
    expect(
        callsAfter.filter(
            (call: { path: string; method: string }) =>
                call.method === "POST" && call.path === "/user/queue"
        )
    ).toHaveLength(
        callsBefore.filter(
            (call: { path: string; method: string }) =>
                call.method === "POST" && call.path === "/user/queue"
        ).length
    );
    await page.reload();
    expect(
        await page.evaluate(() =>
            sessionStorage.getItem("rockit-player-vinyl-mode")
        )
    ).toBe("false");
});
test("vinyl stays still with reduced motion and the preference survives a PWA reload", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPlayer(page);
    await page
        .getByRole("button", { name: "Vinyl record", exact: true })
        .click();
    await expect
        .poll(() =>
            page.evaluate(() =>
                sessionStorage.getItem("rockit-player-vinyl-mode")
            )
        )
        .toBe("true");
    await expect(page.getByTestId("player-vinyl")).toBeVisible();
    const initial = await angle(page);
    await page.waitForTimeout(250);
    expect(await angle(page)).toBe(initial);
    await page.reload();
    await page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .last()
        .click();
    await expect(
        page.getByRole("button", { name: "Square cover", exact: true })
    ).toBeVisible();
});
