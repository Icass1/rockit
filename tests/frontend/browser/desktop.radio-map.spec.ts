import { expect, test } from "@playwright/test";
import { mapStation } from "../fixtures/radio";

const web = "http://127.0.0.1:13000",
    backend = "http://127.0.0.1:18899";
test("country result station dots open a keyboard-accessible play popup on desktop", async ({
    page,
    context,
    request,
}, info) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await page.route("**/radio/stations/by-country/France", (route) =>
        route.fulfill({ json: [mapStation] })
    );
    await page.goto(web + "/radio");
    await page
        .getByPlaceholder("Search for stations, genres, countries...")
        .fill("France");
    await page.getByRole("button", { name: "France", exact: true }).click();
    const marker = page
        .locator(
            'path[role="button"][aria-label="Paris fixture radio"]:visible'
        )
        .first();
    await expect(marker).toBeVisible();
    await marker.focus();
    await page.keyboard.press("Enter");
    const popup = page.locator(".leaflet-popup");
    await expect(popup).toContainText(mapStation.name);
    await popup.locator(".leaflet-popup-close-button").click();
    await marker.click();
    await expect(popup).toContainText(mapStation.name);
    await page.screenshot({ path: info.outputPath("desktop-radio-popup.png") });
    await popup
        .getByRole("button", { name: `Play: ${mapStation.name}`, exact: true })
        .click();
    await expect(
        page.getByRole("button", { name: "Pause", exact: true }).first()
    ).toBeVisible();
});
