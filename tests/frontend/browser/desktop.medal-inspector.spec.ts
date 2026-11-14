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
    const inspector = page.getByTestId("emblem-inspector");
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 45000 });
    await expect(inspector.locator("canvas")).toHaveCount(1);

    await page.screenshot({ path: info.outputPath("prism-front.png") });
    await inspector
        .getByRole("button", { name: "Reverse", exact: true })
        .click();
    await page.screenshot({ path: info.outputPath("prism-reverse.png") });
    await inspector.getByTestId("medal-stage").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(profile).toBeVisible();
    await expect(
        profile.getByTestId("profile-emblems").getByRole("button").first()
    ).toBeFocused();
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .first()
        .click();
    await page
        .getByRole("button", { name: "Back to profile", exact: true })
        .click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .first()
        .click();
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(
        inspector.getByRole("button", { name: "Reverse", exact: true })
    ).toBeVisible({ timeout: 45000 });
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
    await expect(page.locator("canvas")).toHaveCount(0);
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
                    scope: (
                        [
                            "morning",
                            "summer",
                            "library_albums",
                            "repeats",
                            "halloween",
                            "radio_shares",
                        ] as const
                    )[index],
                    visualVariant: [
                        "morning",
                        "summer",
                        "library_albums",
                        "repeats",
                        "halloween",
                        "radio_shares",
                    ][index],
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
        const inspector = page.getByTestId("emblem-inspector");
        await expect(
            inspector.getByRole("button", { name: "Reverse", exact: true })
        ).toBeVisible({ timeout: 45000 });
        await expect(page.locator("canvas")).toHaveCount(1);
        const stage = inspector.getByTestId("medal-stage");
        await stage.scrollIntoViewIfNeeded();
        await stage.screenshot({ path: info.outputPath(`prism-${i}.png`) });
        await inspector
            .getByRole("button", { name: "Reverse", exact: true })
            .click();
        await stage.screenshot({
            path: info.outputPath(`prism-${i}-reverse.png`),
        });
        await page
            .getByRole("button", { name: "Back to profile", exact: true })
            .click();
    }
});

test("the offline native document accepts only its typed bridge and releases one shared renderer", async ({
    page,
}, info) => {
    const { readFile } = await import("node:fs/promises");
    const colors = JSON.parse(
        await readFile("packages/theme/src/tokens.json", "utf8")
    ).themes.dark as Record<string, string>;
    const { medalBridgeColors } =
        await import("../../../packages/ui/src/headless/medalBridge");
    const html = await readFile(
        "apps/mobile/assets/medals/viewer.html",
        "utf8"
    );
    const outgoing: string[] = [];
    await page.exposeFunction("captureMedalEvent", (raw: string) =>
        outgoing.push(raw)
    );
    await page.addInitScript(() => {
        (
            window as unknown as {
                ReactNativeWebView: { postMessage: (raw: string) => void };
            }
        ).ReactNativeWebView = {
            postMessage: (raw) => {
                void (
                    window as unknown as {
                        captureMedalEvent: (data: string) => Promise<void>;
                    }
                ).captureMedalEvent(raw);
            },
        };
    });
    await page.route("https://medal.local/", (route) =>
        route.fulfill({ contentType: "text/html", body: html })
    );
    await page.goto("https://medal.local/");
    await expect
        .poll(() => outgoing.map((raw) => JSON.parse(raw).type))
        .toContain("boot");
    const send = async (command: object) =>
        page.evaluate(
            (command) =>
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: JSON.stringify(command),
                    })
                ),
            { protocol: "rockit-medal-v1", ...command }
        );
    await send({
        type: "init",
        sequence: 1,
        instance: "native-contract",
        badge: listeningProfile.listeningBadges[0],
        ownerName: "</script><script>window.injected=true</script>",
        colors: medalBridgeColors(colors),
    });
    await expect
        .poll(() => outgoing.map((raw) => JSON.parse(raw).type))
        .toContain("ready");
    await expect(page.locator("canvas")).toHaveCount(1);
    const front = await page.locator("canvas").screenshot();
    await send({ type: "back", sequence: 2 });
    const back = await page.locator("canvas").screenshot();
    expect(front.equals(back)).toBe(false);
    await send({ type: "front", sequence: 1 });
    expect((await page.locator("canvas").screenshot()).equals(back)).toBe(true);
    expect(await page.evaluate(() => "injected" in window)).toBe(false);
    await send({ type: "visibility", sequence: 3, active: false });
    await send({ type: "front", sequence: 4 });
    expect((await page.locator("canvas").screenshot()).equals(back)).toBe(true);
    await send({ type: "visibility", sequence: 5, active: true });
    expect((await page.locator("canvas").screenshot()).equals(front)).toBe(
        true
    );
    await page.screenshot({
        path: info.outputPath("native-shared-renderer.png"),
    });
    await send({ type: "dispose", sequence: 6 });
    await expect(page.locator("canvas")).toHaveCount(0);
});
