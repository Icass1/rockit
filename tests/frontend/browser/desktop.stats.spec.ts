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
