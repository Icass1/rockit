import { expect, test } from "@playwright/test";

test("recently opened uses playable counts from unloaded collection summaries", async ({
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
    await page.goto("http://127.0.0.1:13000");
    const section = page
        .locator("section")
        .filter({
            has: page.getByRole("heading", {
                name: "Recently opened",
                exact: true,
            }),
        });
    for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
    ]) {
        await page.setViewportSize(viewport);
        await expect(
            section.getByRole("link", { name: /Playlist only/ })
        ).toContainText("7 medias");
        await expect(
            section.getByRole("link", { name: /Fixture Album/ })
        ).toContainText("1 media");
        await expect(section).not.toContainText("0 songs");
    }
});
