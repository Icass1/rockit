import { expect, test } from "@playwright/test";
import { getTheme } from "@rockit/theme";

const app = "http://127.0.0.1:13001",
    backend = "http://127.0.0.1:18899";
test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
});
test("the installed shell has a dark top edge and gray footer before React loads", async ({
    page,
}) => {
    await page.route("**/_expo/static/js/**/*.js", (route) => route.abort());
    await page.goto(app + "/library");
    await expect(
        page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')
    ).toHaveAttribute("content", "black");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
        "content",
        getTheme("dark").background
    );
    const background = await page.evaluate(() => ({
        html: getComputedStyle(document.documentElement).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        gradient: getComputedStyle(document.body).backgroundImage,
    }));
    expect(background).toEqual({
        html: "rgb(26, 26, 26)",
        body: "rgb(26, 26, 26)",
        gradient: "linear-gradient(rgb(11, 11, 11) 50%, rgb(26, 26, 26) 50%)",
    });
});
test("a region outside the React viewport stays the footer color after reload and rotation", async ({
    page,
}, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(app + "/library");
    await expect(page.getByTestId("navigation-settings")).toBeVisible();
    // Expose the document underlay above and below React's layout box.
    await page.addStyleTag({
        content:
            "#root { height: calc(100% - 88px) !important; margin-top: 44px; flex: none !important; }",
    });
    const read = () =>
        page.evaluate(() => {
            const button = document.querySelector(
                '[data-testid="navigation-settings"]'
            )!;
            const bar = button.parentElement!;
            const root = document.getElementById("root")!;
            const html = getComputedStyle(document.documentElement),
                body = getComputedStyle(document.body);
            return {
                bar: getComputedStyle(bar).backgroundColor,
                html: html.backgroundColor,
                body: body.backgroundColor,
                underlay: body.backgroundImage,
                rootTop: root.getBoundingClientRect().top,
                rootBottom: root.getBoundingClientRect().bottom,
                screen: innerHeight,
            };
        });
    await expect
        .poll(async () => {
            const c = await read();
            return (
                c.body === c.bar &&
                c.html === c.bar &&
                c.underlay ===
                    "linear-gradient(rgb(11, 11, 11) 50%, rgb(26, 26, 26) 50%)" &&
                c.rootTop > 0 &&
                c.rootBottom < c.screen
            );
        })
        .toBe(true);
    await page.screenshot({
        path: info.outputPath("ios-document-header-and-footer.png"),
    });
    await page.reload();
    await expect(page.getByTestId("navigation-settings")).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect
        .poll(async () => {
            const c = await read();
            return c.body === c.bar && c.html === c.bar;
        })
        .toBe(true);
});

test("settings shows the centered administration shortcut only for administrators", async ({
    page,
    request,
}, info) => {
    const settings = page.getByRole("button", { name: "Settings" });
    const stats = page.getByRole("button", { name: "Stats", exact: true });
    const logout = page.getByRole("button", { name: "Log Out", exact: true });
    const admin = page.getByRole("link", { name: "Administration" });
    await page.goto(app + "/settings");
    await expect(settings).toBeVisible();
    await expect(stats).toBeVisible();
    await expect(admin).toHaveCount(0);
    const streak = page.getByTestId("header-streak");
    const bell = page.getByRole("button", {
        name: "Notifications",
        exact: true,
    });
    await expect(streak).toHaveText("2");
    await expect(streak.getByTestId("streak-flame")).toBeVisible();
    await page.setViewportSize({ width: 320, height: 844 });
    const logoBox = (await page
        .getByTestId("rockit-header-logo")
        .boundingBox())!;
    const streakBox = (await streak.boundingBox())!;
    const bellBox = (await bell.boundingBox())!;
    expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(streakBox.x);
    expect(streakBox.x + streakBox.width).toBeLessThanOrEqual(bellBox.x);
    expect(Math.abs(logoBox.x + logoBox.width / 2 - 160)).toBeLessThan(1);
    await page.setViewportSize({ width: 390, height: 844 });

    const session = await request.get(backend + "/user/session", {
        headers: { cookie: "session_id=fixture" },
    });
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/user/session",
            body: { ...(await session.json()), admin: true },
        },
    });
    await page.reload();
    await expect(admin).toBeVisible();
    await expect(admin).toHaveAttribute("href", /^https?:\/\/[^/]+\/admin$/);
    await expect(admin).toHaveAttribute("target", "_blank");
    await expect(admin).toHaveCSS("flex-direction", "row");
    await expect(admin).toHaveCSS("background-color", "rgb(38, 38, 38)");
    const [adminBox, statsBox, logoutBox] = await Promise.all([
        admin.boundingBox(),
        stats.boundingBox(),
        logout.boundingBox(),
    ]);
    expect(adminBox!.y).toBeGreaterThan(logoutBox!.y + logoutBox!.height);
    const rowCenter = (statsBox!.x + logoutBox!.x + logoutBox!.width) / 2;
    expect(
        Math.abs(adminBox!.x + adminBox!.width / 2 - rowCenter)
    ).toBeLessThan(4);
    await page.screenshot({
        path: info.outputPath("mobile-settings-admin.png"),
    });
    const destination = (await admin.getAttribute("href"))!;
    await page
        .context()
        .route(destination, (route) =>
            route.fulfill({ body: "Admin fixture" })
        );
    const popup = page.waitForEvent("popup");
    await admin.click();
    await expect(await popup).toHaveURL(destination);
    await expect(page).toHaveURL(app + "/settings");
});
