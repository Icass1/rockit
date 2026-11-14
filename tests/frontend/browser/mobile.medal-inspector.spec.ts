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
            body: {
                ...listeningProfile,
                username: "Fixture listener",
                listeningBadges: [
                    {
                        ...listeningProfile.listeningBadges[0],
                        key: "library_albums_milestone_10",
                        scope: "library_albums",
                        visualVariant: "library_albums",
                        titleKey: "FRIENDS_BADGE_LIBRARY_ALBUMS_MILESTONE_10",
                        descriptionKey:
                            "FRIENDS_BADGE_LIBRARY_ALBUMS_DESCRIPTION",
                        league: "legend",
                        tier: 3,
                        earnedAt: "2026-01-01T00:00:00Z",
                    },
                ],
            },
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
    await page.screenshot({ path: info.outputPath("profile-mobile.png") });
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .first()
        .click();
    const inspector = page.getByTestId("emblem-inspector");
    if (!supportsWebGL) {
        await expect(inspector.getByRole("status")).toContainText(
            "3D is unavailable"
        );
        await expect(page.locator("canvas")).toHaveCount(0);
        return;
    }
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 45000 });
    await expect(inspector.locator("canvas")).toHaveCount(1);
    const bounds = await inspector.getByTestId("medal-stage").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    const buffer = await inspector.locator("canvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return {
            width: canvas.width,
            height: canvas.height,
            coarse: matchMedia("(pointer: coarse)").matches,
        };
    });
    const ratioCeiling = buffer.coarse ? 1.5 : 2;
    expect(buffer.width).toBeGreaterThan(0);
    expect(buffer.width).toBeLessThanOrEqual(
        Math.ceil(bounds!.width * ratioCeiling)
    );
    expect(buffer.height).toBeLessThanOrEqual(
        Math.ceil(bounds!.height * ratioCeiling)
    );

    const controls = inspector.getByRole("button", {
        name: "Reverse",
        exact: true,
    });
    const controlsBox = await controls.boundingBox();
    expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: info.outputPath("prism-mobile-front.png") });
    await inspector
        .getByRole("button", { name: "Reverse", exact: true })
        .click();
    await page.screenshot({
        path: info.outputPath("prism-mobile-reverse.png"),
    });
    if (context.browser()?.browserType().name() === "chromium") {
        const session = await context.newCDPSession(page);
        const before = await inspector.locator("canvas").screenshot();
        const top = await page.evaluate(() => ({
            window: window.scrollY,
            scroll: Array.from(
                document.querySelectorAll(
                    "[data-testid='medal-profile-detail']"
                )
            ).map((e) => e.scrollTop),
        }));
        const x = bounds!.x + bounds!.width / 2,
            y = bounds!.y + bounds!.height / 2;
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
        });
        for (let n = 1; n <= 6; n++)
            await session.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: x + n * 4, y: y - n * 15 }],
            });
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
        expect(
            (await inspector.locator("canvas").screenshot()).equals(before)
        ).toBe(false);
        const rotated = await inspector.locator("canvas").screenshot();
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [
                { x: x - 30, y, id: 1 },
                { x: x + 30, y, id: 2 },
            ],
        });
        await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
                { x: x - 55, y, id: 1 },
                { x: x + 55, y, id: 2 },
            ],
        });
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
        expect(
            (await inspector.locator("canvas").screenshot()).equals(rotated)
        ).toBe(false);
        expect(
            await page.evaluate(() => ({
                window: window.scrollY,
                scroll: Array.from(
                    document.querySelectorAll(
                        "[data-testid='medal-profile-detail']"
                    )
                ).map((e) => e.scrollTop),
            }))
        ).toEqual(top);
        await session.detach();
    }
    await inspector.getByTestId("medal-stage").focus();
    await page.keyboard.press("ArrowRight");
    await page
        .getByRole("button", { name: "Back to profile", exact: true })
        .click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .first()
        .click();
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 45000 });
    for (const viewport of [
        { width: 320, height: 667 },
        { width: 844, height: 390 },
        { width: 768, height: 1024 },
    ]) {
        await page.setViewportSize(viewport);
        await expect
            .poll(async () => {
                const rect = await inspector
                    .getByTestId("medal-stage")
                    .boundingBox();
                const button = await inspector
                    .getByRole("button", { name: "Reverse", exact: true })
                    .boundingBox();
                return (
                    !!rect &&
                    rect.height >= 80 &&
                    rect.x + rect.width <= viewport.width &&
                    !!button &&
                    button.y + button.height <= viewport.height
                );
            })
            .toBe(true);
        await page.screenshot({
            path: info.outputPath(`prism-mobile-${viewport.width}.png`),
        });
    }
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
    await expect(page.locator("canvas")).toHaveCount(0);
});
