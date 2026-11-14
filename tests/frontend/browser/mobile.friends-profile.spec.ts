import { expect, test } from "@playwright/test";
import { listeningProfile } from "../fixtures/listeningProfile";
import { circleFriends } from "../fixtures/socialCircle";

const backend = "http://127.0.0.1:18899",
    mobile = "http://127.0.0.1:13001";
test.beforeEach(async ({ request, context }) => {
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: circleFriends } },
    });
});
test("mobile opens friend hours and original emblems, explains progress and opens the user's own profile", async ({
    page,
    request,
}, info) => {
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends/circle-sam/level", body: listeningProfile },
    });
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/levels",
            body: { ...listeningProfile, username: "Fixture" },
        },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(mobile + "/friends");
    const circle = page.getByTestId("listening-circle");
    await circle
        .getByRole("button", { name: "View Sam in your listening circle" })
        .click();
    const before = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    expect(
        before.calls.filter((call: { path: string }) =>
            call.path.endsWith("/level")
        )
    ).toHaveLength(0);
    await circle.getByRole("button", { name: "View Sam's profile" }).click();
    const profile = page.getByTestId("listening-profile");
    await expect(profile.getByText("50.6", { exact: true })).toBeVisible();
    await expect(
        profile.getByText("4 of 12 earned", { exact: true })
    ).toBeVisible();
    await page.screenshot({
        path: info.outputPath("friends-mobile-profile.png"),
    });
    await profile
        .getByRole("button", { name: "Explore all 12 emblems" })
        .click();
    await expect(
        profile.getByTestId("profile-emblems").getByRole("button")
    ).toHaveCount(9);
    const gradients = await profile
        .locator("linearGradient")
        .evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(gradients.length).toBeGreaterThan(0);
    expect(new Set(gradients).size).toBe(gradients.length);
    await profile
        .getByTestId("profile-emblems")
        .getByRole("button")
        .nth(4)
        .click();
    await expect(page.getByTestId("medal-profile-detail")).toContainText(
        "42 / 300"
    );

    await page.screenshot({
        path: info.outputPath("friends-mobile-emblem-catalog.png"),
    });
    await page
        .getByRole("button", { name: "Back to profile", exact: true })
        .click();
    await profile.getByRole("button", { name: "Next emblems" }).click();
    await expect(
        profile.getByTestId("profile-emblems").getByRole("button")
    ).toHaveCount(3);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(profile).toHaveCount(0);
    await circle
        .getByRole("button", { name: "Your listening profile" })
        .click();
    await expect(
        page
            .getByTestId("listening-profile")
            .getByText("Fixture", { exact: true })
    ).toBeVisible();
});
test("mobile directory profile failures offer retry and never show fabricated statistics", async ({
    page,
    request,
}) => {
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/circle-sam/level",
            status: 403,
            body: { detail: "forbidden" },
        },
    });
    await page.goto(mobile + "/friends");
    await page
        .getByRole("button", { name: "View Sam's profile", exact: true })
        .last()
        .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("listening-profile")).toHaveCount(0);
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/circle-sam/level",
            status: 200,
            body: listeningProfile,
        },
    });
    await page.getByText("Try again", { exact: true }).click();
    await expect(
        page.getByTestId("listening-profile").getByText("Sam", { exact: true })
    ).toBeVisible();
});

test("emblem families and leagues filter the shared collection without spilling the viewport", async ({
    page,
    request,
    context,
}, info) => {
    const { emblemCollectionProfile } =
        await import("../fixtures/emblemCollection");
    const { verifyEmblemCollection } = await import("./emblemCollectionFlow");
    await request.post(backend + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/friends", body: { friends: circleFriends } },
    });
    await request.post(backend + "/__fixture/fault", {
        data: {
            path: "/friends/circle-sam/level",
            body: emblemCollectionProfile,
        },
    });
    await page.goto("http://127.0.0.1:13001/friends");
    await verifyEmblemCollection(page, info, "mobile-emblems");
});
