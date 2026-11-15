import {
    expect,
    type APIRequestContext,
    type BrowserContext,
    type Page,
    type TestInfo,
} from "@playwright/test";

export async function inspectPlayerAppearance(
    page: Page,
    request: APIRequestContext,
    context: BrowserContext,
    info: TestInfo,
    mobile: boolean
) {
    const backend = "http://127.0.0.1:18899";
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/user/like/media", body: { status: "OK" } },
    });
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${mobile ? 13001 : 13000}/library`);
    const presence = page.getByTestId("header-online-users");
    await expect(presence).toBeVisible();
    for (const count of [1, 2, 1]) {
        await request.post(backend + "/__fixture/online-users", {
            data: { count },
        });
        if (count === 1) await expect(presence).toHaveCount(0);
        else await expect(presence).toHaveAttribute("aria-label", "2 · Online");
    }
    await page
        .getByPlaceholder(/search.*library/i)
        .filter({ visible: true })
        .fill("Playlist exclusive");
    if (mobile) {
        await page
            .getByRole("button", { name: "Playlist exclusive", exact: true })
            .first()
            .click();
        await expect(
            page.getByRole("button", { name: "Pause", exact: true }).first()
        ).toBeVisible();
        await page
            .getByRole("button", { name: "Playlist exclusive", exact: true })
            .last()
            .click();
    } else
        await page
            .getByText("Playlist exclusive", { exact: true })
            .first()
            .click();
    const like = page.getByRole("button", { name: "Like", exact: true }).last();
    await expect(like).toBeVisible();
    const gesture = page.getByTestId("rockit-like-hand").last();
    const transform = () =>
        gesture.evaluate((element) => {
            const matrix = new DOMMatrixReadOnly(
                getComputedStyle(element).transform
            );
            return { x: matrix.m41, y: matrix.m42, rotation: matrix.m12 };
        });
    await like.click();
    await expect.poll(async () => (await transform()).y).toBeLessThan(-0.5);
    expect(Math.abs((await transform()).rotation)).toBeLessThan(0.001);
    await expect(
        page.getByRole("button", { name: "Unlike", exact: true }).last()
    ).toHaveAttribute("aria-pressed", "true");
    const hand = page.getByTestId("rockit-like-hand").last().locator("svg");
    await expect(hand).toHaveAttribute("fill", "#ffffff");
    const fire = page.getByTestId("rockit-like-fire").last();
    await expect
        .poll(async () =>
            Number(await fire.evaluate((e) => getComputedStyle(e).opacity))
        )
        .toBeGreaterThan(0.8);
    await page.screenshot({
        path: info.outputPath(
            mobile ? "mobile-like-fire.png" : "desktop-like-fire.png"
        ),
    });
    await expect
        .poll(async () =>
            Number(await fire.evaluate((e) => getComputedStyle(e).opacity))
        )
        .toBe(0);
    await page
        .getByRole("button", { name: "Unlike", exact: true })
        .last()
        .click();
    await expect(
        page.getByRole("button", { name: "Like", exact: true }).last()
    ).toHaveAttribute("aria-pressed", "false");
    await expect(hand).toHaveAttribute("fill", "none");
    await expect
        .poll(async () => (await transform()).x, { intervals: [16] })
        .toBeGreaterThan(0.3);
    await expect
        .poll(async () => (await transform()).x, { intervals: [16] })
        .toBeLessThan(-0.3);
    await expect
        .poll(async () => await transform())
        .toEqual({ x: 0, y: 0, rotation: 0 });
    await expect(fire).toHaveCSS("opacity", "0");
}
