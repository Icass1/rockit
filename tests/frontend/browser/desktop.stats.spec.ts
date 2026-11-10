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
