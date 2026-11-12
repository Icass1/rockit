import { expect, test, type Page } from "@playwright/test";
import { WebSocket } from "ws";

const mobile = "http://127.0.0.1:13001";
const backend = "http://127.0.0.1:18899";
const headers = { Cookie: "session_id=fixture" };

test.beforeEach(async ({ context, request }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});

async function openPlayer(page: Page, pause = false) {
    await page.goto(mobile + "/library");
    await page.getByPlaceholder(/search.*library/i).fill("Playlist exclusive");
    const song = page.getByRole("button", {
        name: "Playlist exclusive",
        exact: true,
    });
    await song.first().click();
    await expect(
        page.getByRole("button", { name: "Pause", exact: true }).first()
    ).toBeVisible();
    if (pause)
        await page
            .getByRole("button", { name: "Pause", exact: true })
            .first()
            .click();
    await song.last().click();
    await expect(
        page.getByRole("button", { name: "Lyrics", exact: true })
    ).toBeVisible();
}

test("the player retains one shared header, balanced presence and larger reachable tab actions", async ({
    page,
}, info) => {
    await openPlayer(page);
    for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        const logo = page.getByTestId("rockit-header-logo");
        await expect(logo).toHaveCount(1);
        await expect(page.getByLabel("12 · Online")).toBeVisible();
        const bounds = (await logo.boundingBox())!;
        const presence = (await page
            .getByTestId("header-online-users")
            .boundingBox())!;
        const notifications = (await page
            .getByRole("button", { name: "Notifications", exact: true })
            .boundingBox())!;
        expect(presence.x + presence.width).toBeLessThanOrEqual(bounds.x);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(notifications.x);
        expect(
            (await page.getByTestId("player-top-bar").boundingBox())!.y
        ).toBeGreaterThanOrEqual(bounds.y + bounds.height);
        const transport = (await page
            .getByRole("button", { name: "Pause", exact: true })
            .boundingBox())!;
        expect(transport.y + transport.height).toBeLessThanOrEqual(
            (await page
                .getByRole("button", { name: "Queue", exact: true })
                .boundingBox())!.y
        );
        for (const name of ["Queue", "Lyrics", "Related"]) {
            const button = page.getByRole("button", { name, exact: true });
            const rect = (await button.boundingBox())!;
            expect(rect.height).toBeGreaterThanOrEqual(44);
            expect(rect.y).toBeGreaterThan(844 / 2);
            expect(rect.y + rect.height).toBeLessThan(
                (await page.getByTestId("navigation-index").boundingBox())!.y
            );
            expect(
                await button
                    .locator("div")
                    .first()
                    .evaluate((element) =>
                        parseFloat(getComputedStyle(element).fontSize)
                    )
            ).toBeGreaterThanOrEqual(18);
        }
        await page.screenshot({ path: info.outputPath(`player-${width}.png`) });
    }
});

test("wrapped lyrics center the active line on open, resize and seeking to the final line", async ({
    page,
    request,
}, info) => {
    const lines = Array.from({ length: 16 }, (_, i) => ({
        timestamp_s: i <= 8 ? 0 : (i - 8) * 2,
        text: `A long fixture lyric with several wrapped words that must keep its measured position when this verse becomes active, line ${i}`,
    }));
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/lyrics/song-2/correction-context",
            body: {
                provider: "Fixture",
                publicId: "lyrics-review",
                revision: "fixture",
                offset: 0,
                lines,
                syncStatus: "provider",
            },
        },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page, true);
    await page.getByRole("button", { name: "Lyrics", exact: true }).click();
    const scroll = page.getByTestId("lyrics-scroll");
    const active = page.getByTestId("active-lyric");
    const expectCentered = async (index: number) => {
        await expect(active).toHaveText(lines[index].text);
        try {
            await expect
                .poll(async () => {
                    const viewport = (await scroll.boundingBox())!;
                    const line = (await active.boundingBox())!;
                    return Math.abs(
                        line.y +
                            line.height / 2 -
                            viewport.y -
                            viewport.height / 2
                    );
                })
                .toBeLessThan(8);
        } catch (error) {
            await info.attach("final-lyrics-geometry", {
                body: JSON.stringify(
                    await scroll.evaluate((node) => {
                        const active = document.querySelector(
                            '[data-testid="active-lyric"]'
                        ) as HTMLElement;
                        const content = active.parentElement!;
                        return {
                            viewport: node.getBoundingClientRect().toJSON(),
                            scrollTop: node.scrollTop,
                            clientHeight: node.clientHeight,
                            active: active.getBoundingClientRect().toJSON(),
                            offsetTop: active.offsetTop,
                            text: active.textContent,
                            content: content.getBoundingClientRect().toJSON(),
                            paddingTop: getComputedStyle(content).paddingTop,
                        };
                    })
                ),
                contentType: "application/json",
            });
            throw error;
        }
    };
    await expectCentered(8);
    await page.setViewportSize({ width: 320, height: 844 });
    await expectCentered(8);
    await page.getByText(lines[12].text, { exact: true }).click();
    await expectCentered(12);
    await page.getByText(lines[15].text, { exact: true }).click();
    await expectCentered(15);
    await expect(page.getByTestId("rockit-header-logo")).toBeVisible();
    await page.screenshot({ path: info.outputPath("centered-lyrics.png") });
});

test("Library interleaves media by added date and keeps type filters and selection available", async ({
    page,
    request,
}, info) => {
    const library = await (
        await request.get(backend + "/user/library/medias", { headers })
    ).json();
    const song = await (
        await request.get(backend + "/media/song/song-1", { headers })
    ).json();
    const album = library.albums[0].item;
    const playlist = library.playlists[0].item;
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/user/library/medias",
            body: {
                ...library,
                albums: [
                    { item: album, addedAt: "2026-01-03T00:00:00Z" },
                    {
                        item: {
                            ...album,
                            publicId: "album-older",
                            name: "Older album",
                        },
                        addedAt: "2026-01-01T00:00:00Z",
                    },
                ],
                playlists: [
                    { item: playlist, addedAt: "2026-01-02T00:00:00Z" },
                ],
                songs: [{ item: song, addedAt: "2026-01-04T00:00:00Z" }],
            },
        },
    });
    await page.goto(mobile + "/library");
    const names = [song.name, album.name, playlist.name, "Older album"];
    await expect(
        page.getByRole("button", { name: song.name, exact: true })
    ).toBeVisible();
    const order = await page
        .getByTestId("library-scroll")
        .getByRole("button")
        .evaluateAll(
            (nodes, expected) =>
                nodes
                    .map((node) => node.getAttribute("aria-label"))
                    .filter((name) => name !== null && expected.includes(name)),
            names
        );
    expect(order).toEqual(names);
    await expect(page.getByText("ALBUMS", { exact: true })).toHaveCount(0);
    await page.getByText("Albums", { exact: true }).click();
    await expect(
        page.getByRole("button", { name: playlist.name, exact: true })
    ).toHaveCount(0);
    await expect(
        page.getByRole("button", { name: album.name, exact: true })
    ).toBeVisible();
    await page.getByText("All", { exact: true }).click();
    await page
        .getByRole("button", { name: album.name, exact: true })
        .click({ delay: 650 });
    await page.getByText("Select items", { exact: true }).click();
    await expect(
        page.getByRole("button", { name: album.name, exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: info.outputPath("mixed-library.png") });
});

test("a slow collection response does not delay the mini player's selection feedback", async ({
    page,
    request,
}) => {
    const response = await (
        await request.post(backend + "/media/collection/album-1/queue", {
            headers,
            data: { startPublicId: "song-2" },
        })
    ).json();
    await request.post(backend + "/__fixture/reset");
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/media/collection/album-1/queue",
            body: response,
            delayMs: 2000,
        },
    });
    await page.goto(mobile + "/album/album-1");
    let completed = false;
    page.on("response", (r) => {
        if (r.url().endsWith("/media/collection/album-1/queue"))
            completed = true;
    });
    const song = page.getByRole("button", {
        name: "Playlist exclusive",
        exact: true,
    });
    await song.first().click();
    await expect(song).toHaveCount(2, { timeout: 500 });
    await expect(song.last()).toHaveAttribute("aria-disabled", "true");
    expect(completed).toBe(false);
    await expect(song.last()).not.toHaveAttribute("aria-disabled", "true", {
        timeout: 6000,
    });
});

test("mobile queue drag persists occurrence order while preserving the selected song", async ({
    page,
    request,
    browserName,
}) => {
    test.skip(
        browserName !== "chromium",
        "Uses Chromium touch input; physical iOS acceptance is separate."
    );
    const socket = new WebSocket("ws://127.0.0.1:18899/ws");
    await new Promise<void>((resolve) => socket.once("open", resolve));
    socket.send(
        JSON.stringify({
            type: "current_queue",
            queue: ["song-1", "song-2", "synthetic-0"].map(
                (mediaPublicId, i) => ({
                    mediaPublicId,
                    listPublicId: null,
                    queueMediaId: i + 1,
                    randomIndex: i,
                    sortedIndex: i,
                })
            ),
        })
    );
    await expect
        .poll(
            async () =>
                (
                    await (
                        await request.get(backend + "/user/queue", { headers })
                    ).json()
                ).total
        )
        .toBe(3);
    socket.send(
        JSON.stringify({
            type: "current_media",
            currentTimeMs: 0,
            playbackId: "fixture-boundary",
            queueMediaId: 1,
            mediaPublicId: "song-1",
            queueType: "SORTED",
        })
    );
    await expect
        .poll(
            async () =>
                (
                    await (
                        await request.get(backend + "/user/queue", { headers })
                    ).json()
                ).currentQueueMediaId
        )
        .toBe(1);
    socket.close();

    await page.goto(mobile + "/library");
    await page
        .getByRole("button", { name: "Canción de prueba — Snow", exact: true })
        .last()
        .click();
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    const handles = page.getByTestId("queue-drag-handle");
    await expect(handles).toHaveCount(3);
    await handles.nth(2).click({ trial: true });
    const source = (await handles.nth(2).boundingBox())!;
    const target = (await handles.first().boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    const x = source.x + source.width / 2;
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y: source.y + source.height / 2 }],
    });
    await page.waitForTimeout(150);
    for (let step = 1; step <= 15; step++) {
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
                {
                    x,
                    y:
                        source.y +
                        source.height / 2 +
                        ((target.y - source.y) * step) / 15,
                },
            ],
        });
        await page.waitForTimeout(20);
    }
    await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await expect
        .poll(async () =>
            (
                await (
                    await request.get(backend + "/user/queue", { headers })
                ).json()
            ).queue.map((item: { queueMediaId: number }) => item.queueMediaId)
        )
        .toEqual([3, 1, 2]);
    const state = await (
        await request.get(backend + "/user/queue", { headers })
    ).json();
    expect(state.currentQueueMediaId).toBe(1);
});

test("search ignores an older response that arrives after the final typed query", async ({
    page,
}) => {
    let releaseOld: (() => void) | undefined;
    const old = new Promise<void>((resolve) => {
        releaseOld = resolve;
    });
    const result = (name: string) => ({
        results: [
            {
                type: "song",
                searchResult: true,
                name,
                providerUrl: "https://fixture.invalid/" + name,
                imageUrl: "",
                artists: [],
                provider: "Fixture",
                downloaded: false,
                url: null,
                publicId: null,
            },
        ],
    });
    await page.route("**/media/search", async (route) => {
        const query = route.request().postDataJSON().query;
        if (query === "Old") await old;
        await route.fulfill({ json: result(query) });
    });
    await page.goto(mobile + "/search");
    const input = page.getByRole("textbox").first();
    const started = page.waitForRequest((r) =>
        r.url().endsWith("/media/search")
    );
    await input.fill("Old");
    await started;
    await input.fill("Final phrase");
    await expect(page.getByText("Final phrase", { exact: true })).toBeVisible();
    releaseOld!();
    await expect(page.getByText("Old", { exact: true })).toHaveCount(0);
    await input.clear();
    await expect(page.getByText("Final phrase", { exact: true })).toHaveCount(
        0
    );
});

test("featured collection headers compose their official art and the corresponding icon", async ({
    page,
}) => {
    for (const kind of ["liked", "most-listened", "recent-mix"]) {
        await page.goto(mobile + "/playlist/" + kind);
        const artwork = page
            .getByRole("img")
            .filter({ has: page.locator("svg") });
        await expect(artwork.first()).toBeVisible();
    }
});

test("review screenshots cover mobile destinations and each player panel", async ({
    page,
}, info) => {
    test.skip(process.env.SCREENSHOT_REVIEW !== "1", "Opt-in visual capture.");
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [name, path] of [
        ["home", "/"],
        ["library", "/library"],
        ["album", "/album/album-1"],
        ["playlist", "/playlist/playlist-1"],
        ["downloads", "/downloader"],
        ["offline", "/storage"],
        ["artist", "/artist/artist-1"],
        ["radio", "/radio"],
        ["friends", "/friends"],
        ["search", "/search"],
        ["settings", "/settings"],
        ["stats", "/stats"],
        ["liked", "/playlist/liked"],
        ["most-listened", "/playlist/most-listened"],
        ["recent-mix", "/playlist/recent-mix"],
    ]) {
        await page.goto(mobile + path);
        if (name === "offline") {
            await expect(page.getByText("Saved on this device")).toBeVisible();
        } else {
            await expect(page.getByTestId("rockit-header-logo")).toBeVisible();
            await page.getByTestId("navigation-index").click({ trial: true });
        }
        await page.waitForTimeout(1000);
        await page.screenshot({ path: info.outputPath(name + ".png") });
    }
    await openPlayer(page, true);
    await page
        .getByRole("button", { name: "Queue", exact: true })
        .click({ trial: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: info.outputPath("player.png") });
    for (const name of ["Queue", "Lyrics", "Related"]) {
        await page.getByRole("button", { name, exact: true }).click();
        const sheet = page.getByRole("button", {
            name: "Bottom sheet backdrop",
        });
        await expect(sheet).toBeVisible();
        await page.waitForTimeout(400);
        await page.screenshot({
            path: info.outputPath("player-" + name.toLowerCase() + ".png"),
        });
        await sheet.click({ position: { x: 10, y: 120 } });
    }
});
