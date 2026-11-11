import { expect, test } from "@playwright/test";

test.use({ timezoneId: "UTC" });

test("stats v2 renders listening bars and labels for short ranges", async ({
    page,
    request,
    context,
}) => {
    await request.post("http://127.0.0.1:18899/__fixture/reset");
    await context.addCookies([
        {
            name: "session_id",
            value: "fixture",
            url: "http://127.0.0.1:18899",
            httpOnly: true,
        },
    ]);
    await page.goto("http://127.0.0.1:13000/stats/v2");
    const today = page.getByRole("button", { name: "Today", exact: true });
    const week = page.getByRole("button", { name: "Last 7 days", exact: true });
    expect(
        await today.evaluate((button) => button.nextElementSibling?.textContent)
    ).toBe("Last 7 days");
    for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
    ]) {
        await page.setViewportSize(viewport);
        for (const button of [
            week,
            page.getByRole("button", { name: "Last 30 days", exact: true }),
            today,
        ]) {
            await button.click();
            await expect(button).toHaveAttribute("aria-pressed", "true");
            const bars = page.locator(".recharts-bar-rectangle path");
            await expect(bars.first()).toBeVisible();
            await expect
                .poll(() => bars.first().getAttribute("height").then(Number))
                .toBeGreaterThan(0);
            const ticks = page.locator(".recharts-xAxis-tick-labels text");
            await expect(ticks.first()).toBeVisible();
            await expect(ticks.first()).toHaveText(
                button === today ? "00:00" : button === week ? "Mon" : "Nov 2"
            );
            expect(
                (await ticks.allTextContents()).every(
                    (label) => label.trim().length > 0
                )
            ).toBe(true);
            await expect(async () => {
                await bars.first().hover();
                await expect(
                    page.locator(".recharts-tooltip-wrapper").last()
                ).toContainText("211.2", { timeout: 500 });
            }).toPass();
        }
    }
});

test("monthly timelines keep every month label and identify multi-year tooltip dates", async ({
    page,
    request,
    context,
}) => {
    await request.post("http://127.0.0.1:18899/__fixture/reset");
    await context.addCookies([
        {
            name: "session_id",
            value: "fixture",
            url: "http://127.0.0.1:18899",
            httpOnly: true,
        },
    ]);
    await page.goto("http://127.0.0.1:13000/stats/v2");
    for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
    ]) {
        await page.setViewportSize(viewport);
        for (const [range, count] of [
            ["All time", 30],
            ["Last year", 12],
        ] as const) {
            await page
                .getByRole("button", { name: range, exact: true })
                .click();
            const ticks = page.locator(".recharts-xAxis-tick-labels text");
            await expect(ticks).toHaveCount(count);
            expect(await ticks.allTextContents()).toEqual(
                Array.from({ length: count }, (_, index) =>
                    new Date(2024, index, 1).toLocaleDateString("en", {
                        month: "short",
                    })
                )
            );
            const bars = page.locator(".recharts-bar-rectangle path");
            await expect(async () => {
                await bars.first().hover();
                const tooltip = page
                    .locator(".recharts-tooltip-wrapper")
                    .last();
                await expect(tooltip).toContainText("211.2", { timeout: 500 });
                if (range === "All time")
                    await expect(tooltip).toContainText("2024");
                else await expect(tooltip).not.toContainText("2026");
            }).toPass();
            await bars.last().scrollIntoViewIfNeeded();
            await expect(bars.last()).toBeInViewport();
        }
    }
});

test("weekly heatmap distinguishes quiet, moderate and busy listening hours", async ({
    page,
    request,
    context,
}) => {
    await request.post("http://127.0.0.1:18899/__fixture/reset");
    await context.addCookies([
        {
            name: "session_id",
            value: "fixture",
            url: "http://127.0.0.1:18899",
            httpOnly: true,
        },
    ]);
    await page.goto("http://127.0.0.1:13000/stats/v2");
    const colors = [];
    for (const minutes of [34, 1122, 2245]) {
        const cell = page
            .locator("div[title]")
            .filter({ hasNot: page.locator("*") })
            .and(page.locator(`[title*="${minutes.toLocaleString("en")}"]`));
        await expect(cell).toHaveCount(1);
        colors.push(
            await cell.evaluate(
                (element) => getComputedStyle(element).backgroundColor
            )
        );
    }
    expect(new Set(colors).size).toBe(3);
});

test("playback keeps heatmap requests local and refreshes stats without a skeleton", async ({
    page,
    request,
    context,
}) => {
    await request.post("http://127.0.0.1:18899/__fixture/reset");
    await context.addCookies([
        {
            name: "session_id",
            value: "fixture",
            url: "http://127.0.0.1:18899",
            httpOnly: true,
        },
    ]);
    let heatmapRequests = 0;
    await page.route("**/listening-heatmap", async (route) => {
        heatmapRequests++;
        await route.fulfill({
            json: { segments: [{ startMs: 0, endMs: 30000, count: 3 }] },
        });
    });
    let statsRequests = 0;
    let releaseRefresh: (() => void) | undefined;
    await page.route("**/stats/v2/user", async (route) => {
        statsRequests++;
        const response = await route.fetch();
        const data = await response.json();
        if (statsRequests === 2) {
            await new Promise<void>((resolve) => {
                releaseRefresh = resolve;
            });
            data.summary.totalPlayTimeMinutes = 13;
            data.summary.totalPlayTimeMs = 780000;
        }
        await route.fulfill({ response, json: data });
    });
    await page.goto("http://127.0.0.1:13000/library");
    await page
        .getByPlaceholder("Search in Library")
        .filter({ visible: true })
        .fill("Playlist exclusive");
    await page.getByText("Playlist exclusive", { exact: true }).first().click();
    const pause = page
        .getByRole("button", { name: "Pause", exact: true })
        .filter({ visible: true });
    await expect(pause).toBeVisible();
    await expect.poll(() => heatmapRequests).toBe(1);
    await page.locator('a[href="/stats/v2"]').filter({ visible: true }).click();
    await expect(page.getByText("12m", { exact: true })).toBeVisible();
    await expect.poll(() => releaseRefresh, { timeout: 20000 }).toBeTruthy();
    await expect(page.getByText("12m", { exact: true })).toBeVisible();
    await expect(page.locator(".skeleton")).toHaveCount(0);
    releaseRefresh!();
    await expect(page.getByText("13m", { exact: true })).toBeVisible();
    await pause.click();
    expect(heatmapRequests).toBe(1);
    await page
        .getByRole("button", { name: "Listening history", exact: true })
        .click();
    const history = page.getByRole("region", {
        name: "Listening history",
        exact: true,
    });
    await expect(history).toBeVisible();
    await expect(
        history.getByRole("button", { name: /heard 4 times/ })
    ).toHaveCount(1);
    await expect(
        history.getByRole("button", { name: /heard 3 times/ })
    ).toHaveCount(1);
    for (const viewport of [
        { width: 1280, height: 450 },
        { width: 390, height: 844 },
    ]) {
        await page.setViewportSize(viewport);
        await expect(page.getByText("13m", { exact: true })).toBeVisible();
        await expect(page.locator(".skeleton")).toHaveCount(0);
    }
});

test("seeking preserves listened sections and does not count the skipped middle", async ({
    page,
    request,
    context,
}) => {
    await request.post("http://127.0.0.1:18899/__fixture/reset");
    await context.addCookies([
        {
            name: "session_id",
            value: "fixture",
            url: "http://127.0.0.1:18899",
            httpOnly: true,
        },
    ]);
    let heatmapRequests = 0;
    await page.route("**/listening-heatmap", async (route) => {
        heatmapRequests++;
        await route.fulfill({
            json: { segments: [{ startMs: 0, endMs: 30000, count: 2 }] },
        });
    });
    await page.goto("http://127.0.0.1:13000/library");
    await page
        .getByPlaceholder("Search in Library")
        .filter({ visible: true })
        .fill("Playlist exclusive");
    await page.getByText("Playlist exclusive", { exact: true }).first().click();
    const pause = page
        .getByRole("button", { name: "Pause", exact: true })
        .filter({ visible: true });
    await expect(pause).toBeVisible();
    const slider = page.locator('#default-slider[max="30"]');
    await expect
        .poll(async () => Number(await slider.inputValue()))
        .toBeGreaterThan(3);
    const seekTo = async (fraction: number): Promise<void> => {
        const box = await slider.boundingBox();
        if (!box) throw new Error("Missing playback slider");
        await page.mouse.click(
            box.x + box.width * fraction,
            box.y + box.height / 2
        );
    };
    await seekTo(0.8);
    await expect
        .poll(async () => Number(await slider.inputValue()))
        .toBeGreaterThan(24.5);
    await pause.click();
    const trigger = page.getByRole("button", {
        name: "Listening history",
        exact: true,
    });
    await trigger.click();
    const history = page.getByRole("region", {
        name: "Listening history",
        exact: true,
    });
    await expect(
        history.getByRole("button", { name: /heard 3 times/ })
    ).toHaveCount(2);
    await expect(
        history.getByRole("button", { name: /heard 2 times/ })
    ).toHaveCount(2);
    expect(heatmapRequests).toBe(1);
    await history
        .getByRole("button", { name: "Close listening history" })
        .click();
    await seekTo(0.04);
    await page
        .getByRole("button", { name: "Play", exact: true })
        .filter({ visible: true })
        .click();
    await expect
        .poll(async () => Number(await slider.inputValue()))
        .toBeGreaterThan(2);
    await pause.click();
    await trigger.click();
    await expect(
        history.getByRole("button", { name: /heard 4 times/ })
    ).toHaveCount(1);
    expect(heatmapRequests).toBe(1);
});
