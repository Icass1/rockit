import {
    expect,
    type APIRequestContext,
    type Page,
    type TestInfo,
} from "@playwright/test";
import { recapStats } from "../fixtures/annualRecap";
import { listeningProfile } from "../fixtures/listeningProfile";
import { circleFriends } from "../fixtures/socialCircle";

const backend = "http://127.0.0.1:18899";
export async function prepareRecap(request: APIRequestContext) {
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: circleFriends } },
    });
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/levels",
            body: { ...listeningProfile, username: "Fixture" },
        },
    });
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/stats/v2/user", body: recapStats },
    });
}
export async function inspectRecap(
    page: Page,
    info: TestInfo,
    host: "mobile" | "desktop"
) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
        .getByTestId("listening-circle")
        .getByRole("button", { name: "Your listening profile" })
        .click();
    await page
        .getByRole("button", {
            name: `Recap ${new Date().getUTCFullYear()}`,
            exact: true,
        })
        .click();
    const recap = page.getByTestId("annual-recap");
    await expect(
        recap.getByText("Your year. Your sound.", { exact: true })
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${host}-recap-intro.png`) });
    await recap.getByRole("button", { name: "Start my recap" }).click();
    await expect(recap.getByText("24,840", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${host}-recap-time.png`) });
    const fits = async () => {
        const body = await recap.getByTestId("recap-story").boundingBox();
        const content = await recap
            .getByTestId("recap-story")
            .locator(":scope > div")
            .first()
            .boundingBox();
        expect(content!.height).toBeLessThanOrEqual(body!.height + 2);
    };
    await fits();
    await recap.getByRole("button", { name: "Next story" }).click();
    await expect(
        recap.getByText("Everything In Its Right Place", { exact: true })
    ).toBeVisible();
    await fits();
    await recap.getByRole("button", { name: "Next story" }).click();
    await fits();
    await page.screenshot({ path: info.outputPath(`${host}-recap-songs.png`) });
    if (host === "mobile") {
        await page.setViewportSize({ width: 320, height: 667 });
        await fits();
        await page.screenshot({
            path: info.outputPath("mobile-recap-compact.png"),
        });
    }
    await recap.getByRole("button", { name: "Next story" }).click();
    await expect(recap.getByTestId("recap-artist-rank")).toHaveText("#5");
    await fits();
    await page.screenshot({
        path: info.outputPath(`${host}-recap-artist.png`),
    });
    if (host === "mobile")
        await page.setViewportSize({ width: 390, height: 844 });
    for (let rank = 4; rank >= 1; rank--) {
        if (host === "desktop") await page.keyboard.press("ArrowRight");
        else await recap.getByRole("button", { name: "Next story" }).click();
        await expect(recap.getByTestId("recap-artist-rank")).toHaveText(
            `#${rank}`
        );
    }
    await expect(recap.getByText("Radiohead", { exact: true })).toBeVisible();
    await page.screenshot({
        path: info.outputPath(`${host}-recap-winner.png`),
    });
    for (let index = 0; index < 5; index++) {
        const done = recap.getByRole("button", { name: "Back to my music" });
        if (await done.count()) break;
        await recap.getByRole("button", { name: "Next story" }).click();
    }
    await expect(
        recap.getByText("That was your sound.", { exact: true })
    ).toBeVisible();
    await fits();
    await page.screenshot({
        path: info.outputPath(`${host}-recap-summary.png`),
    });
    await recap.getByRole("button", { name: "Watch again" }).click();
    await expect(
        recap.getByText("Your year. Your sound.", { exact: true })
    ).toBeVisible();
    const previousYear = new Date().getUTCFullYear() - 1;
    await recap
        .getByRole("button", { name: `Recap ${previousYear}`, exact: true })
        .click();
    await expect(
        recap.getByText(`Your year in sound · ${previousYear}`, { exact: true })
    ).toBeVisible();
    await recap.getByRole("button", { name: "Close recap" }).click();
    await expect(recap).toHaveCount(0);
}
