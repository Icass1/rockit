import { expect, test } from "@playwright/test";
import { mapStation } from "../fixtures/radio";

const mobile = "http://127.0.0.1:13001",
    backend = "http://127.0.0.1:18899";
test("radio map supports touch pan, pinch and a station preview before playing", async ({
    page,
    context,
    request,
    browserName,
}, info) => {
    test.skip(
        browserName !== "chromium",
        "CDP supplies actual multi-touch input."
    );
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await page.route("**/radio/stations/by-country/France", (route) =>
        route.fulfill({ json: [mapStation] })
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(mobile + "/radio");
    const viewport = page.getByTestId("radio-map-viewport"),
        surface = page.getByTestId("radio-map-surface");
    await expect(viewport).toBeVisible();
    const transform = () =>
        surface.evaluate((element) => getComputedStyle(element).transform);
    const start = await transform();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect.poll(transform).not.toBe(start);
    await page.getByRole("button", { name: "Reset map", exact: true }).click();
    await expect.poll(transform).toBe(start);
    const touch = await context.newCDPSession(page);
    const dispatch = (
        type: "touchStart" | "touchMove" | "touchEnd",
        points: { x: number; y: number; id: number }[]
    ) => touch.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    await dispatch("touchStart", [{ x: 100, y: 320, id: 1 }]);
    for (let i = 1; i <= 8; i++)
        await dispatch("touchMove", [
            { x: 100 + i * 8, y: 320 + i * 3, id: 1 },
        ]);
    await dispatch("touchEnd", []);
    await expect.poll(transform).not.toBe(start);
    const panned = await transform();
    await dispatch("touchStart", [
        { x: 130, y: 370, id: 1 },
        { x: 230, y: 370, id: 2 },
    ]);
    for (let i = 1; i <= 8; i++)
        await dispatch("touchMove", [
            { x: 130 - i * 5, y: 370, id: 1 },
            { x: 230 + i * 5, y: 370, id: 2 },
        ]);
    await dispatch("touchEnd", []);
    await expect.poll(transform).not.toBe(panned);
    await page.getByRole("button", { name: "Reset map", exact: true }).click();
    await page.getByRole("textbox").fill("France");
    await page.getByRole("button", { name: "France", exact: true }).click();
    const marker = page.locator('circle[aria-label="Paris fixture radio"]');
    await expect(marker).toBeVisible();
    await marker.tap();
    const preview = page.getByTestId("radio-station-preview");
    await expect(preview).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Pause", exact: true })
    ).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("mobile-radio-map.png") });
    const header = page.getByTestId("radio-results-header");
    const before = (await header.boundingBox())!.y;
    await dispatch("touchStart", [{ x: 195, y: before - 12, id: 1 }]);
    for (let i = 1; i <= 10; i++)
        await dispatch("touchMove", [
            { x: 195, y: before - 12 - i * 18, id: 1 },
        ]);
    await dispatch("touchEnd", []);
    await expect
        .poll(async () => (await header.boundingBox())!.y)
        .toBeLessThan(before - 50);
    await preview
        .getByRole("button", { name: "Play: Paris fixture radio", exact: true })
        .click({ trial: true });
    await page.screenshot({
        path: info.outputPath("mobile-radio-preview.png"),
    });
    await preview
        .getByRole("button", { name: "Play: Paris fixture radio", exact: true })
        .click();
    await expect(
        page.getByRole("button", { name: "Pause", exact: true }).first()
    ).toBeVisible();
});
