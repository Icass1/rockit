import { expect, test } from "@playwright/test";

const mobile = "http://127.0.0.1:13001";
const backend = "http://127.0.0.1:18899";

test("cold offline launch opens unvisited routes and plays the saved library", async ({
    page,
    context,
    request,
}, info) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await context.addInitScript(() => {
        const played: HTMLMediaElement[] = [];
        (window as typeof window & { __played: HTMLMediaElement[] }).__played =
            played;
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            if (!played.includes(this)) played.push(this);
            return play.call(this);
        };
    });
    await page.goto(mobile + "/library");
    const album = page.getByText("Fixture Album", { exact: true });
    await expect(album).toBeVisible();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller)
            await new Promise<void>((resolve) =>
                navigator.serviceWorker.addEventListener(
                    "controllerchange",
                    () => resolve(),
                    { once: true }
                )
            );
    });
    await album.click({ delay: 650 });
    await page.getByText("Download list to device", { exact: true }).click();
    await page.getByText("Offline", { exact: true }).click();
    await expect(
        page.getByText("Playlist exclusive", { exact: true }).first()
    ).toBeVisible();
    await page.goto(mobile + "/album/album-1");
    await expect(
        page.getByText("Fixture Album", { exact: true })
    ).toBeVisible();
    await page.close();
    await context.setOffline(true);
    const cold = await context.newPage();
    const errors: string[] = [];
    cold.on("pageerror", (error) => errors.push(error.message));
    await cold.goto(mobile + "/library");
    await cold.getByText("Offline", { exact: true }).click();
    await expect(
        cold.getByText("Playlist exclusive", { exact: true }).first()
    ).toBeVisible();
    await cold.screenshot({ path: info.outputPath("offline-library.png") });
    await cold.getByText("Playlist exclusive", { exact: true }).first().click();
    await expect(
        cold.getByRole("button", { name: "Pause", exact: true }).first()
    ).toBeVisible();
    await expect
        .poll(() =>
            cold.evaluate(() =>
                (
                    window as typeof window & { __played: HTMLMediaElement[] }
                ).__played.some(
                    (audio) =>
                        audio.src.startsWith("blob:") &&
                        !audio.paused &&
                        audio.currentTime > 0
                )
            )
        )
        .toBe(true);
    await cold.screenshot({ path: info.outputPath("offline-playing.png") });
    await cold.goto(mobile + "/storage");
    await expect(
        cold.getByText("Saved on this device", { exact: true })
    ).toBeVisible();
    await expect(
        cold.getByText("Playlist exclusive", { exact: true })
    ).toBeVisible();
    await cold.reload();
    await expect(
        cold.getByText("Playlist exclusive", { exact: true })
    ).toBeVisible();
    let queueWrites = 0;
    cold.on("request", (request) => {
        if (request.method() === "POST" && request.url().endsWith("/queue"))
            queueWrites++;
    });
    await cold.goto(mobile + "/album/album-1");
    const cover = cold.getByTestId("collection-artwork-play");
    await cover.tap();
    await cover.tap();
    await expect(
        cold.getByRole("button", { name: "Pause", exact: true }).first()
    ).toBeVisible();
    await expect
        .poll(() =>
            cold.evaluate(() =>
                (
                    window as typeof window & { __played: HTMLMediaElement[] }
                ).__played.some(
                    (audio) =>
                        audio.src.startsWith("blob:") &&
                        !audio.paused &&
                        audio.currentTime > 0
                )
            )
        )
        .toBe(true);
    expect(queueWrites).toBe(0);
    expect(errors).toEqual([]);
});
