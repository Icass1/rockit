import { expect, test } from "@playwright/test";

const mobile = "http://127.0.0.1:13001";
const backend = "http://127.0.0.1:18899";

test.beforeEach(async ({ context, request }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});

test("mobile destinations share their theme and statistics retains five main navigation actions", async ({
    page,
    request,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["radio", "friends", "artist/artist-1", "stats"]) {
        await page.goto(`${mobile}/${route}`);
        await expect(page.getByTestId("navigation-index")).toBeVisible();
        await expect(page.locator('[data-testid^="navigation-"]')).toHaveCount(
            5
        );
        await expect
            .poll(() =>
                page.evaluate(
                    () => getComputedStyle(document.body).backgroundColor
                )
            )
            .toBe("rgb(11, 11, 11)");
        if (route === "friends")
            await expect(
                page.getByText("Fixture Friend", { exact: true })
            ).toBeVisible();
        if (route === "radio")
            await expect(page.getByRole("textbox").first()).toBeVisible();
        await expect(page.locator("body")).toHaveCSS("color-scheme", "dark");
    }
    expect(errors).toEqual([]);
    const calls = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    expect(calls.unhandled).toEqual([]);
    expect(calls.protocolErrors).toEqual([]);
});

test("Library and Search expose moved destinations and featured lists without loading their tracks", async ({
    page,
    request,
}) => {
    await page.goto(mobile + "/library");
    await expect(
        page.getByText("Fixture Album", { exact: true })
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Downloads", exact: true })
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Liked Songs", exact: true }).first()
    ).toBeVisible();
    const shortcut = page
        .getByRole("button", { name: "Liked Songs", exact: true })
        .first();
    expect(
        await shortcut.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return [0.1, 0.5, 0.9].every((fraction) => {
                const hit = document.elementFromPoint(
                    bounds.x + bounds.width / 2,
                    bounds.y + bounds.height * fraction
                );
                return !!hit && element.contains(hit);
            });
        })
    ).toBe(true);
    const calls = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    expect(
        calls.calls.filter((call: { path: string }) =>
            call.path.startsWith("/featured/")
        )
    ).toHaveLength(0);
    await page.getByTestId("navigation-search").click();
    await page.getByRole("button", { name: "Radio", exact: true }).click();
    await expect(page.getByRole("textbox").first()).toBeVisible();
    await expect(page.getByTestId("navigation-search")).toHaveAttribute(
        "aria-pressed",
        "true"
    );
});

test("short landscape keeps navigation reachable without horizontal overflow", async ({
    page,
}) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(mobile + "/friends");
    await expect(
        page.getByText("Fixture Friend", { exact: true })
    ).toBeVisible();
    const nav = page.getByTestId("navigation-settings");
    await expect(nav).toBeVisible();
    const bounds = await nav.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
        )
    ).toBe(true);
});

test("album context menu saves audio and cover for the device's offline catalog", async ({
    page,
    context,
}) => {
    await page.goto(mobile + "/library");
    const album = page.getByText("Fixture Album", { exact: true });
    await expect(album).toBeVisible();
    await album.click({ delay: 650 });
    await page.getByText("Download list to device", { exact: true }).click();
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const db = await new Promise<IDBDatabase>((resolve) => {
                    const request = indexedDB.open("rockit-offline-media");
                    request.onsuccess = () => resolve(request.result);
                });
                return new Promise<number>((resolve) => {
                    const request = db
                        .transaction("songs")
                        .objectStore("songs")
                        .getAll();
                    request.onsuccess = () => {
                        resolve(
                            request.result.filter(
                                (record) =>
                                    record.audioBlob?.size > 0 &&
                                    record.coverBlob?.size > 0
                            ).length
                        );
                        db.close();
                    };
                });
            })
        )
        .toBeGreaterThan(0);
    await page.goto(mobile + "/storage");
    await expect(
        page.getByText("Saved on this device", { exact: true })
    ).toBeVisible();
    const image = page.locator('img[src^="blob:"]').first();
    await expect(image).toBeVisible();
    await context.setOffline(true);
    expect(
        await image.evaluate(
            (node) =>
                (node as HTMLImageElement).complete &&
                (node as HTMLImageElement).naturalWidth > 0
        )
    ).toBe(true);
});

test("search shelves remain horizontally browsable inside one vertically scrollable page", async ({
    page,
    request,
}) => {
    const results = ["song", "album", "artist", "playlist"].flatMap((type) =>
        Array.from({ length: 8 }, (_, i) => ({
            type,
            searchResult: true,
            name: `Shelf ${type} ${i}`,
            providerUrl: `https://fixture.invalid/${type}/${i}`,
            imageUrl: "",
            artists: [],
            provider: "Fixture",
            downloaded: false,
            url: null,
            publicId: null,
        }))
    );
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/media/search", body: { results } },
    });
    await page.goto(mobile + "/search");
    await page.getByRole("textbox").first().fill("Shelf");
    await expect(page.getByText("Shelf song 0", { exact: true })).toBeVisible();
    await page
        .getByText("Shelf playlist 0", { exact: true })
        .scrollIntoViewIfNeeded();
    await expect(
        page.getByText("Shelf playlist 0", { exact: true })
    ).toBeVisible();
    expect(
        await page.evaluate(
            () =>
                [...document.querySelectorAll("div")].filter(
                    (e) =>
                        getComputedStyle(e).overflowX === "auto" &&
                        e.scrollWidth > e.clientWidth
                ).length
        )
    ).toBeGreaterThanOrEqual(4);
});

test("Radio country selection and friend secondary actions use existing flows", async ({
    page,
    request,
}) => {
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/radio/stations/by-country/Spain", body: [] },
    });
    await page.goto(mobile + "/radio");
    await page.locator('path[aria-label="Spain"]').click({ force: true });
    await expect
        .poll(async () => {
            const calls = await (
                await request.get(backend + "/__fixture/calls")
            ).json();
            return calls.calls.some(
                (call: { path: string }) =>
                    call.path === "/radio/stations/by-country/Spain"
            );
        })
        .toBe(true);
    await page.goto(mobile + "/friends");
    await expect(
        page.getByText("Fixture Friend", { exact: true })
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(4);
});
