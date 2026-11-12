import { expect, test } from "@playwright/test";

const mobile = "http://127.0.0.1:13001",
    backend = "http://127.0.0.1:18899";
const headers = { Cookie: "session_id=fixture" };
test.beforeEach(async ({ context, request }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});
test("Home uses the current profile photo and keeps featured collections in Library", async ({
    page,
    request,
}, testInfo) => {
    const session = await (
        await request.get(backend + "/user/session", { headers })
    ).json();
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/user/session",
            body: { ...session, image: backend + "/assets/artwork.svg" },
        },
    });
    await page.goto(mobile);
    await expect(
        page.getByText("For you", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText("Featured Lists", { exact: true })).toHaveCount(
        0
    );
    await expect(
        page.locator('[role="img"][aria-label="fixture"]')
    ).toBeVisible();
    expect(
        await page.locator('img[src*="/assets/artwork.svg"]').count()
    ).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath("home.png") });
});
test("featured and pinned collections share one horizontal Library shelf without duplicate builtins", async ({
    page,
    request,
}, testInfo) => {
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/user/navigation/pins",
            body: {
                pins: [
                    {
                        publicId: "liked",
                        type: "playlist",
                        name: "Liked Songs",
                        url: "/playlist/liked",
                        imageUrl: null,
                        builtinKey: "liked",
                    },
                    {
                        publicId: "playlist-1",
                        type: "playlist",
                        name: "Personal pin",
                        url: "/playlist/playlist-1",
                        imageUrl: backend + "/assets/artwork.svg",
                        builtinKey: null,
                    },
                ],
            },
        },
    });
    await page.goto(mobile + "/library");
    await expect(
        page.getByRole("button", { name: "Liked Songs", exact: true })
    ).toHaveCount(1);
    await page
        .getByRole("button", { name: "Personal pin", exact: true })
        .scrollIntoViewIfNeeded();
    await expect(
        page.getByRole("button", { name: "Personal pin", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Pinned", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("library-pins.png") });
});
test("31 bars and labels fit the stats card on narrow mobile screens", async ({
    page,
    request,
}, testInfo) => {
    const stats = await (
        await request.post(backend + "/stats/user", {
            headers,
            data: {
                range: "30d",
                start: null,
                end: null,
                timezoneOffsetMinutes: 0,
            },
        })
    ).json();
    const minutes = Array.from({ length: 31 }, (_, i) => ({
        minutes: i + 1,
        start: new Date(Date.UTC(2026, 9, i + 1)).toISOString(),
        end: new Date(Date.UTC(2026, 9, i + 2)).toISOString(),
        label: String(i + 1),
    }));
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/stats/user", body: { ...stats, minutes } },
    });
    for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(mobile + "/stats");
        const chart = page.getByTestId("minutes-chart");
        await chart.scrollIntoViewIfNeeded();
        await expect(
            page.getByTestId("minutes-chart-bars").getByRole("button")
        ).toHaveCount(31);
        expect(
            await chart.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)
        ).toBe(true);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        ).toBe(true);
        const labels = await page
            .getByTestId("minutes-chart-labels")
            .evaluate((element) =>
                Array.from(element.children, (child) => {
                    const rect = child.getBoundingClientRect();
                    return { left: rect.left, right: rect.right };
                })
            );
        for (let i = 1; i < labels.length; i++) {
            expect(labels[i].left).toBeGreaterThanOrEqual(
                labels[i - 1].right - 1
            );
        }
        await page.screenshot({
            path: testInfo.outputPath(`stats-${width}.png`),
        });
    }
});
test("collection playback is compact, transport fills are explicit, and the map keeps its proportions", async ({
    page,
}, testInfo) => {
    await page.goto(mobile + "/album/album-1");
    await expect(
        page.getByRole("button", { name: "Play", exact: true })
    ).toHaveCount(1);
    const play = page.getByRole("button", { name: "Play", exact: true });
    expect((await play.boundingBox())!.height).toBeLessThanOrEqual(48);
    const icon = play.locator("svg");
    expect(await icon.getAttribute("fill")).not.toBe("currentColor");
    expect(await icon.getAttribute("fill")).not.toBe("none");
    await page.screenshot({ path: testInfo.outputPath("album.png") });
    await page.goto(mobile + "/radio");
    const map = page.locator('svg[viewBox="0 10 720 290"]');
    await expect(map).toBeVisible();
    const bounds = await map.boundingBox();
    expect(bounds!.width / bounds!.height).toBeCloseTo(720 / 290, 1);
    await expect(map).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
    expect(
        (await page.getByTestId("navigation-settings").boundingBox())!.y +
            (await page.getByTestId("navigation-settings").boundingBox())!
                .height
    ).toBeLessThanOrEqual(page.viewportSize()!.height);
    await page.screenshot({ path: testInfo.outputPath("radio.png") });
});

test("PWA registers track navigation after a real HTML audio playing event", async ({
    page,
}) => {
    await page.addInitScript(() => {
        const state = window as typeof window & { __sessionTrace: string[] };
        state.__sessionTrace = [];
        const NativeAudio = window.Audio;
        const WrappedAudio = function (src?: string) {
            const audio = new NativeAudio(src);
            audio.addEventListener("playing", () =>
                state.__sessionTrace.push("native-playing")
            );
            return audio;
        } as unknown as typeof Audio;
        WrappedAudio.prototype = NativeAudio.prototype;
        window.Audio = WrappedAudio;
        const session = navigator.mediaSession,
            set = session.setActionHandler.bind(session);
        session.setActionHandler = (action, handler) => {
            state.__sessionTrace.push(
                `${action}:${handler ? "handler" : "null"}`
            );
            set(action, handler);
        };
    });
    await page.goto(mobile + "/library");
    await page.getByPlaceholder(/search.*library/i).fill("Playlist exclusive");
    await page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .first()
        .click();
    await expect
        .poll(() =>
            page.evaluate(() => {
                const trace = (
                    window as typeof window & { __sessionTrace: string[] }
                ).__sessionTrace;
                const index = trace.lastIndexOf("native-playing");
                return (
                    index >= 0 &&
                    [
                        "nexttrack:handler",
                        "previoustrack:handler",
                        "seekbackward:null",
                        "seekforward:null",
                    ].every((action) => trace.slice(index + 1).includes(action))
                );
            })
        )
        .toBe(true);
});

test("the shell reserves a bottom system inset once", async ({ page }) => {
    // Model the values supplied by safe-area-context's CSS env probe. This is a
    // layout contract check, not an emulation of the iOS system interface.
    await page.addInitScript(() => {
        const getStyle = window.getComputedStyle.bind(window);
        window.getComputedStyle = (element, pseudo) => {
            const computed = getStyle(element, pseudo);
            if (
                element instanceof HTMLElement &&
                element.style.position === "fixed" &&
                element.style.paddingBottom.includes("safe-area-inset-bottom")
            ) {
                return new Proxy(computed, {
                    get(target, property) {
                        if (property === "paddingBottom") return "34px";
                        if (property === "paddingTop") return "47px";
                        return Reflect.get(target, property, target);
                    },
                });
            }
            return computed;
        };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(mobile + "/library");
    const settings = page.getByTestId("navigation-settings");
    await expect(settings).toBeVisible();
    await expect
        .poll(async () => {
            const bounds = (await settings.boundingBox())!;
            return Math.round(844 - bounds.y - bounds.height);
        })
        .toBe(34);
    const touchHeight = (await settings.boundingBox())!.height;
    expect(touchHeight).toBeGreaterThanOrEqual(44);
    expect(touchHeight).toBeLessThanOrEqual(50);
});
