import { expect, test } from "@playwright/test";
import { inspectRecap, prepareRecap } from "./annualRecapFlow";

const backend = "http://127.0.0.1:18899";
test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await prepareRecap(request);
});
test("mobile recap reads each selected year once and fits its story states", async ({
    page,
    request,
}, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:13001/friends");
    await inspectRecap(page, info, "mobile");
    const { calls } = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    const reads = calls.filter(
        (call: { path: string }) => call.path === "/stats/v2/user"
    );
    expect(reads).toHaveLength(2);
    expect(reads[0].body.range).toBe("custom");
    expect(reads[0].body.start).toBe(
        `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`
    );
    expect(reads[1].body.end).toBe(
        `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`
    );
});
test("recap errors can be retried without a blank page", async ({
    page,
    request,
}) => {
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/stats/v2/user", status: 503 },
    });
    await page.goto("http://127.0.0.1:13001/friends");
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
    await expect(page.getByRole("alert")).toBeVisible();
    const { recapStats } = await import("../fixtures/annualRecap");
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/stats/v2/user", status: 200, body: recapStats },
    });
    await page.getByText("Try again", { exact: true }).click();
    await expect(
        page.getByText("Your year. Your sound.", { exact: true })
    ).toBeVisible();
});
