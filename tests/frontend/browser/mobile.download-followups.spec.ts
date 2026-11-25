import { expect, test } from "@playwright/test";

const backend = "http://127.0.0.1:18899",
    mobile = "http://127.0.0.1:13001";
test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});

test("a single song keeps the audio attachment name", async ({ page }) => {
    await page.goto(mobile + "/library");
    await page.getByPlaceholder(/search.*library/i).fill("Snow");
    const song = page.getByRole("button", {
        name: "Canción de prueba — Snow",
        exact: true,
    });
    await song.first().click({ delay: 650 });
    const saved = page.waitForEvent("download");
    await page.getByText("Download", { exact: true }).click();
    expect((await saved).suggestedFilename()).toBe("Fixture-track.mp3");
});

test("a Rockit featured list exports its resolved songs", async ({
    page,
    request,
}) => {
    await page.goto(mobile + "/playlist/recent-mix");
    await page.getByRole("button", { name: /^More options$/i }).click();
    const saved = page.waitForEvent("download");
    await page.getByText("Download ZIP", { exact: true }).click();
    expect((await saved).suggestedFilename()).toBe("RockIt.zip");
    const { calls } = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    const download = calls.findLast(
        (call: { path: string }) => call.path === "/downloader/download-zip"
    );
    expect(download.body.ids.length).toBeGreaterThan(0);
    expect(
        download.body.ids.every((id: string) => !id.includes("recent-mix"))
    ).toBe(true);
});
