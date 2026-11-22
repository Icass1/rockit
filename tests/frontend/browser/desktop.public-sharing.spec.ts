import { expect, test } from "@playwright/test";

const backend =
    process.env.PUBLIC_SHARING_BACKEND_URL ?? "http://127.0.0.1:18899";
const web = "http://127.0.0.1:13000";

test.beforeEach(async ({ request }) => {
    await request.post(`${backend}/__fixture/reset`);
});

for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 900, height: 400 },
]) {
    test(`anonymous shared songs and videos open the player at ${viewport.width}x${viewport.height}`, async ({
        page,
        request,
        context,
    }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.setViewportSize(viewport);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        for (const [id, title] of [
            ["song-1", "Canción de prueba — Snow"],
            ["video-1", "Shared fixture video"],
        ]) {
            await page.goto(`${web}/?media=${id}`);
            await expect(page).toHaveURL(`${web}/?media=${id}`);
            await expect(
                page.getByRole("region", { name: "Now Playing", exact: true })
            ).toBeVisible();
            await expect(page.locator("#app-footer")).toContainText(title);
            await expect(
                page.getByRole("link", { name: "Log in", exact: true })
            ).toBeVisible();
            const options = page.locator(
                '#app-footer button[aria-label="More Options"]'
            );
            await expect(options).toBeVisible();
            await options.press("Enter");
            await page.getByText("Copy link", { exact: true }).click();
            expect(
                await page.evaluate(() => navigator.clipboard.readText())
            ).toBe(`${web}/?media=${id}`);
        }
        const { calls, messages } = await (
            await request.get(`${backend}/__fixture/calls`)
        ).json();
        expect(
            calls.filter((call: { path: string }) =>
                call.path.startsWith("/user/queue")
            )
        ).toEqual([]);
        expect(messages).toEqual([]);
        expect(errors).toEqual([]);
    });
}

test("anonymous collection pages play locally, advance tracks and copy links", async ({
    page,
    context,
    request,
}) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`${web}/album/album-1`);
    await expect(
        page.getByRole("heading", { name: "Fixture Album", exact: true })
    ).toBeVisible();
    await page
        .getByRole("button", { name: "More Options", exact: true })
        .first()
        .click();
    await page.getByText("Copy link", { exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        `${web}/album/album-1`
    );
    await page
        .getByRole("button", { name: "Play", exact: true })
        .first()
        .click();
    await expect(page.locator("#app-footer")).toContainText(
        "Canción de prueba — Snow"
    );
    await page
        .locator("#app-footer")
        .getByRole("button", { name: "Next media", exact: true })
        .click();
    await expect(page.locator("#app-footer")).toContainText(
        "Playlist exclusive"
    );
    await page.goto(`${web}/playlist/playlist-1`);
    await expect(
        page.getByRole("heading", { name: "Playlist only", exact: true })
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Play", exact: true })
        .first()
        .click();
    await expect(page.locator("#app-footer")).toContainText(
        "Playlist exclusive"
    );
    const { calls } = await (
        await request.get(`${backend}/__fixture/calls`)
    ).json();
    expect(
        calls.filter(
            (call: { path: string; method: string }) =>
                call.path.includes("/collection/") && call.method === "POST"
        )
    ).toEqual([]);
    expect(
        calls.some(
            (call: { path: string }) =>
                call.path === "/media/collection/album-1/playable"
        )
    ).toBe(true);
});

test("account pages explain sign-in without redirecting anonymous visitors", async ({
    page,
}) => {
    for (const route of [
        "library",
        "settings",
        "downloader",
        "friends",
        "stats/v2",
    ]) {
        await page.goto(`${web}/${route}`);
        await expect(page).toHaveURL(`${web}/${route}`);
        await expect(
            page.getByText(
                "Sign in to use your library, downloads and account features.",
                { exact: true }
            )
        ).toBeVisible();
    }
});

test("an early guest Play click survives a pending session lookup", async ({
    page,
}) => {
    let release: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route(`${backend}/user/session`, async (route) => {
        await ready;
        await route.continue();
    });
    await page.goto(`${web}/playlist/playlist-1`);
    await expect(
        page.getByRole("heading", { name: "Playlist only", exact: true })
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Play", exact: true })
        .first()
        .click();
    release();
    await expect(page.locator("#app-footer")).toContainText(
        "Playlist exclusive"
    );
});

test("shared links also replace the signed-in queue and open the player", async ({
    page,
    context,
}) => {
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await page.goto(`${web}/?media=song-2`);
    await expect(
        page.getByRole("region", { name: "Now Playing", exact: true })
    ).toBeVisible();
    await expect(page.locator("#app-footer")).toContainText(
        "Playlist exclusive"
    );
    await expect(page.locator("[data-queue-media-id]")).toHaveCount(1);
});
