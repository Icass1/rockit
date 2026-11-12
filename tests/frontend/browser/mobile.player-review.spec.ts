import { expect, test, type Page } from "@playwright/test";

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
