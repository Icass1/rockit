import {
    expect,
    type APIRequestContext,
    type BrowserContext,
    type Page,
    type TestInfo,
} from "@playwright/test";
import { listeningProfile } from "../fixtures/listeningProfile";

/** Read the real workbook through the fixture API, never a second translation table. */
export async function inspectVocabulary(
    page: Page,
    request: APIRequestContext,
    context: BrowserContext,
    info: TestInfo,
    host: "desktop" | "mobile",
    lang: "en" | "es" | "fr"
) {
    const backend = "http://127.0.0.1:18899";
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    const update = await context.request.post(backend + "/user/lang", {
        data: { lang },
    });
    expect(update.status(), await update.text()).toBe(200);
    const dictionary = (await (
        await request.get(backend + "/vocabulary/user")
    ).json()) as { currentLang: string; vocabulary: Record<string, string> };
    expect(dictionary.currentLang).toBe(lang);
    const v = dictionary.vocabulary;
    const badge = {
        ...listeningProfile.listeningBadges[0],
        scope: "anniversary",
        target: 1,
        current: 1,
        holderPercentage: 0,
    };
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/levels",
            body: {
                ...listeningProfile,
                username: "Fixture listener",
                listeningBadges: [badge],
            },
        },
    });
    await page.goto(
        `http://127.0.0.1:${host === "desktop" ? 13000 : 13001}/friends`
    );
    await page
        .getByTestId("listening-circle")
        .getByRole("button", { name: v.SOCIAL_PROFILE_SELF, exact: true })
        .click();
    const profile = page.getByTestId("listening-profile");
    const hours = new Intl.NumberFormat(lang, {
        maximumFractionDigits: 1,
    }).format(listeningProfile.totalListeningSeconds / 3600);
    await expect(profile.getByText(hours, { exact: true })).toBeVisible();
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .first()
        .click();
    const detail = page.getByTestId("medal-profile-detail");
    await expect(detail).toContainText(
        v.MEDAL_STORY_ANNIVERSARY_ONE.replace("{target}", "1")
    );
    await expect(detail.getByTestId("medal-rarity")).toHaveText(
        new Intl.NumberFormat(lang, {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(0)
    );
    await expect(
        page.getByTestId("emblem-inspector").locator("canvas")
    ).toHaveCount(1, { timeout: 45000 });
    await page.screenshot({ path: info.outputPath(`${host}-${lang}.png`) });
    if (lang !== "en") {
        await expect(detail).not.toContainText(
            "year since your RockIt story began"
        );
    }
}
