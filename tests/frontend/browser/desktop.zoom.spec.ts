import { expect, test, type Page } from "@playwright/test";

const backend = "http://127.0.0.1:18899";
const desktop = process.env.FRONTEND_WEB_URL ?? "http://127.0.0.1:13000";

// Reproduce the extension's body scaling, fixed-element pinning, and its
// offscreen absolute-element repair without installing an extension in CI.
// Behavior reference: https://github.com/nizioleque/mouse-pinch-to-zoom
async function mouseZoom(page: Page, scale: number) {
    await page.evaluate((scale) => {
        const body = document.body;
        for (const element of document.querySelectorAll<HTMLElement>("*")) {
            const style = getComputedStyle(element);
            if (style.position !== "fixed") continue;
            const rect = element.getBoundingClientRect();
            Object.assign(element.style, {
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                bottom: "auto",
                right: "auto",
                transform: "none",
            });
        }
        document.documentElement.style.overflow = "scroll";
        body.style.overflow = "visible";
        body.style.transformOrigin = "top left";
        body.style.transform = `scale(${scale})`;

        const observe = () =>
            observer.observe(body, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ["style"],
            });
        const observer = new MutationObserver((records) => {
            observer.disconnect();
            for (const record of records) {
                const candidates =
                    record.type === "attributes"
                        ? [record.target]
                        : Array.from(record.addedNodes);
                for (const node of candidates) {
                    if (
                        !(node instanceof HTMLElement) ||
                        getComputedStyle(node).position !== "absolute"
                    )
                        continue;
                    const rect = node.getBoundingClientRect();
                    if (
                        rect.left <= innerWidth &&
                        rect.top <= innerHeight &&
                        rect.right >= 0 &&
                        rect.bottom >= 0
                    )
                        continue;
                    let ancestor = node.parentElement;
                    while (
                        ancestor &&
                        ancestor !== body &&
                        getComputedStyle(ancestor).position === "static"
                    )
                        ancestor = ancestor.parentElement;
                    if (
                        ancestor &&
                        ["fixed", "sticky"].includes(
                            getComputedStyle(ancestor).position
                        )
                    )
                        continue;
                    const anchor = ancestor?.getBoundingClientRect();
                    node.style.setProperty(
                        "top",
                        `${(innerHeight / 2 - (anchor?.top ?? 0)) / scale}px`,
                        "important"
                    );
                    node.style.setProperty(
                        "left",
                        `${(innerWidth / 2 - (anchor?.left ?? 0)) / scale}px`,
                        "important"
                    );
                    node.style.setProperty("bottom", "auto", "important");
                    node.style.setProperty("right", "auto", "important");
                }
            }
            observe();
        });
        observe();
    }, scale);
}

test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
        { name: "session_id", value: "fixture", url: desktop, httpOnly: true },
    ]);
    const album = await (
        await request.get(backend + "/media/album/album-1")
    ).json();
    album.songs = Array.from({ length: 80 }, (_, index) => ({
        ...album.songs[0],
        ...(index > 0
            ? { publicId: `zoom-song-${index}`, name: `Zoom song ${index}` }
            : {}),
    }));
    album.total = album.songs.length;
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/media/album/album-1", body: album },
    });
});

for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
    { width: 926, height: 430 },
]) {
    test(`pinch zoom preserves list geometry at ${viewport.width}x${viewport.height}`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        await page.goto(desktop + "/album/album-1");
        const list = page
            .locator('[role="list"]')
            .filter({ has: page.locator("[data-row-key]") });
        const rows = list.locator("[data-row-key]");
        await expect(rows.filter({ hasText: "Zoom song 5" })).toHaveCount(1);
        await expect
            .poll(() => list.evaluate((element) => element.clientHeight))
            .toBeLessThan(82 * 68);
        const originalHeight = await list.evaluate(
            (element) => element.clientHeight
        );
        await mouseZoom(page, 1.5);

        // Rendering new rows while zoomed must use unscaled measurements.
        const scrollTo = async (offset: number) => {
            await list.evaluate((element, offset) => {
                let parent = element.parentElement;
                while (
                    parent &&
                    !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)
                )
                    parent = parent.parentElement;
                if (parent) {
                    const scale =
                        element.getBoundingClientRect().height /
                        element.clientHeight;
                    parent.scrollTo({
                        behavior: "instant",
                        top:
                            parent.scrollTop +
                            (element.getBoundingClientRect().top -
                                parent.getBoundingClientRect().top) /
                                scale +
                            Math.min(
                                offset,
                                element.clientHeight -
                                    parent.clientHeight / scale
                            ),
                    });
                }
            }, offset);
        };
        await scrollTo(1800);
        await expect(rows.filter({ hasText: "Zoom song 30" })).toHaveCount(1);
        await expect
            .poll(() => list.evaluate((element) => element.clientHeight))
            .toBeLessThanOrEqual(originalHeight);
        const geometry = await rows.evaluateAll((elements) =>
            elements.map((element) => {
                const rect = element.getBoundingClientRect();
                return { top: rect.top, bottom: rect.bottom, left: rect.left };
            })
        );
        for (let index = 1; index < geometry.length; index++) {
            expect(
                Math.abs(geometry[index]!.top - geometry[index - 1]!.bottom)
            ).toBeLessThan(1);
            expect(geometry[index]!.left).toBe(geometry[0]!.left);
        }
        await scrollTo(10000);
        await expect(rows.filter({ hasText: "Zoom song 79" })).toHaveCount(1);
        await scrollTo(0);
        await expect(rows.filter({ hasText: "Zoom song 5" })).toHaveCount(1);
        await expect
            .poll(() => list.evaluate((element) => element.clientHeight))
            .toBeLessThanOrEqual(originalHeight);
    });
}

test("zoom keeps progress attached to the footer and the closed player hidden", async ({
    page,
    request,
}) => {
    const queue = await (
        await request.get(backend + "/media/collection/album-1/playable")
    ).json();
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/media/collection/album-1/queue", body: queue },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(desktop + "/album/album-1");
    await expect
        .poll(() =>
            page
                .locator('[role="list"]')
                .filter({ has: page.locator("[data-row-key]") })
                .evaluate((element) => element.clientHeight)
        )
        .toBeLessThan(82 * 68);
    await page
        .getByText("Canción de prueba — Snow", { exact: true })
        .first()
        .click();
    const footer = page.locator("#app-footer");
    await expect(
        footer.getByRole("button", { name: "Pause", exact: true })
    ).toBeVisible();
    const progress = footer.locator('input[type="range"]').first();
    const fill = progress.locator("..").locator("div").first();
    await mouseZoom(page, 1.5);
    // The footer is now below the screen. Playback still updates its fill.
    await expect
        .poll(() => fill.evaluate((element) => parseFloat(element.style.width)))
        .toBeGreaterThan(1);
    const attached = await progress.evaluate((element) => {
        const track = element.parentElement!.getBoundingClientRect();
        const fill =
            element.parentElement!.firstElementChild!.getBoundingClientRect();
        return {
            x: fill.left - track.left,
            y: fill.top - track.top,
            height: fill.height - track.height,
        };
    });
    expect(attached).toEqual({ x: 0, y: 0, height: 0 });
    const player = page.getByRole("region", {
        name: "Now playing",
        includeHidden: true,
    });
    await expect(player).toBeHidden();
    for (let cycle = 0; cycle < 2; cycle++) {
        // Programmatic clicks exercise state changes while the footer is offscreen.
        await footer
            .getByRole("button", { name: "Show player" })
            .evaluate((element: HTMLButtonElement) => element.click());
        await expect(player).toBeVisible();
        await footer
            .getByRole("button", { name: "Hide player" })
            .evaluate((element: HTMLButtonElement) => element.click());
        await expect(player).toBeHidden();
    }
    await progress.press("ArrowRight");
    await expect.poll(() => progress.inputValue()).not.toBe("0");
    await footer
        .getByRole("button", { name: "Next media" })
        .evaluate((element: HTMLButtonElement) => element.click());
    await expect(
        footer.getByText("Playlist exclusive", { exact: true })
    ).toBeVisible();
    await expect(player).toBeHidden();
    await footer
        .getByRole("button", { name: "Previous media" })
        .evaluate((element: HTMLButtonElement) => element.click());
    await expect(
        footer.getByText("Canción de prueba — Snow", { exact: true })
    ).toBeVisible();
});
