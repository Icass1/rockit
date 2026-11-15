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
test("the installed shell starts with a gray document edge before React loads", async ({
    page,
}) => {
    await page.route("**/_expo/static/js/**/*.js", (route) => route.abort());
    await page.goto(app + "/library");
    await expect(
        page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')
    ).toHaveAttribute("content", "black");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
        "content",
        getTheme("dark").secondary
    );
    const background = await page.evaluate(() => ({
        html: getComputedStyle(document.documentElement).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
    }));
    expect(background).toEqual({
        html: "rgb(26, 26, 26)",
        body: "rgb(26, 26, 26)",
    });
});
test("a region outside the React viewport stays the footer color after reload and rotation", async ({
    page,
}, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(app + "/library");
    await expect(page.getByTestId("navigation-settings")).toBeVisible();
    // Model the part of the installed iOS surface outside React's layout box.
    // This exercises the document underlay the previous inset-only test omitted.
    await page.addStyleTag({
        content:
            "#root { height: calc(100% - 44px) !important; flex: none !important; }",
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
                rootBottom: root.getBoundingClientRect().bottom,
                screen: innerHeight,
            };
        });
    await expect
        .poll(async () => {
            const c = await read();
            return (
                c.body === c.bar && c.html === c.bar && c.rootBottom < c.screen
            );
        })
        .toBe(true);
    await page.screenshot({
        path: info.outputPath("ios-document-bottom-gray.png"),
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
