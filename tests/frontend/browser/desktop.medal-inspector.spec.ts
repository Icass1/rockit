import { expect, test } from "@playwright/test";
import { listeningProfile } from "../fixtures/listeningProfile";
import { circleFriends } from "../fixtures/socialCircle";

const backend = "http://127.0.0.1:18899";
test("Prism inspection renders, turns, closes and recovers from a lost WebGL context", async ({
    page,
    request,
    context,
}, info) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: circleFriends } },
    });
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/levels",
            body: { ...listeningProfile, username: "Fixture listener" },
        },
    });
    await page.goto("http://127.0.0.1:13000/friends");
    await page
        .getByTestId("listening-circle")
        .getByRole("button", { name: "Your listening profile" })
        .click();
    const profile = page.getByTestId("listening-profile");
    await expect(profile.getByTestId("medal-stage")).toHaveCount(0);
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .first()
        .click();
    const inspector = profile.getByTestId("emblem-inspector");
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 15000 });
    await expect(inspector.locator("canvas")).toHaveCount(1);
    await inspector.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath("prism-front.png") });
    await inspector
        .getByRole("button", { name: "Reverse", exact: true })
        .click();
    await page.screenshot({ path: info.outputPath("prism-reverse.png") });
    await inspector.getByTestId("medal-stage").focus();
    await page.keyboard.press("ArrowRight");
    await inspector
        .getByRole("button", { name: "Close 3D view", exact: true })
        .click();
    await expect(profile.locator("canvas")).toHaveCount(0);
    await profile
        .getByRole("button", { name: "Inspect in 3D", exact: true })
        .click();
    await expect(profile.locator("canvas")).toHaveCount(1);
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 15000 });
    await inspector
        .locator("canvas")
        .evaluate((canvas) =>
            canvas.dispatchEvent(
                new Event("webglcontextlost", { cancelable: true })
            )
        );
    await expect(inspector.getByRole("status")).toContainText(
        "3D is unavailable"
    );
    await expect(profile.locator("canvas")).toHaveCount(0);
});

test("six league finishes retain their outlines and family colors in the inspector", async ({
    page,
    request,
    context,
}, info) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: circleFriends } },
    });
    test.setTimeout(90000);
    const leagues = [
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "legend",
    ] as const;
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/levels",
            body: {
                ...listeningProfile,
                username: "Fixture listener",
                listeningBadges: leagues.map((league, index) => ({
                    ...listeningProfile.listeningBadges[index],
                    key: `league-${league}`,
                    tier: 1,
                    league,
                    earnedAt: "2026-01-01T00:00:00Z",
                })),
            },
        },
    });
    await page.goto("http://127.0.0.1:13000/friends");
    await page
        .getByTestId("listening-circle")
        .getByRole("button", { name: "Your listening profile" })
        .click();
    const profile = page.getByTestId("listening-profile");
    await profile
        .getByRole("button", { name: "Explore all 6 emblems" })
        .click();
    const choices = profile.getByTestId("profile-emblems").getByRole("button");
    for (let i = 0; i < 6; i++) {
        await choices.nth(i).click();
        const inspector = profile.getByTestId("emblem-inspector");
        await expect(
            inspector.getByRole("button", { name: "Reverse", exact: true })
        ).toBeVisible({ timeout: 15000 });
        await expect(profile.locator("canvas")).toHaveCount(1);
        const stage = inspector.getByTestId("medal-stage");
        await stage.scrollIntoViewIfNeeded();
        await stage.screenshot({ path: info.outputPath(`prism-${i}.png`) });
        await inspector
            .getByRole("button", { name: "Reverse", exact: true })
            .click();
        await stage.screenshot({
            path: info.outputPath(`prism-${i}-reverse.png`),
        });
        await inspector
            .getByRole("button", { name: "Front", exact: true })
            .click();
    }
});
