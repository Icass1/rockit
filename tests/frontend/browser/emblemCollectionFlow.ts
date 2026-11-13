import { expect, type Page, type TestInfo } from "@playwright/test";

/** Both hosts render the same catalog, so exercise the same filters and bounds. */
export async function verifyEmblemCollection(
    page: Page,
    info: TestInfo,
    prefix: string
) {
    const circle = page.getByTestId("listening-circle");
    await circle
        .getByRole("button", { name: "View Sam in your listening circle" })
        .click();
    await circle.getByRole("button", { name: "View Sam's profile" }).click();
    const profile = page.getByTestId("listening-profile");
    await profile
        .getByRole("button", { name: /^Explore all .* emblems$/ })
        .click();
    await expect(
        profile.getByTestId("profile-emblems").getByRole("button")
    ).toHaveCount(9);
    await profile.getByTestId("profile-emblems").scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(prefix + "-leagues.png") });
    await profile
        .getByRole("button", { name: "RockIt! anniversaries", exact: true })
        .click();
    await expect(
        profile.getByTestId("profile-emblems").getByRole("button")
    ).toHaveCount(1);
    await expect(profile.getByTestId("profile-emblem-detail")).toContainText(
        "calendar year"
    );
    await profile.getByRole("button", { name: "Diamond", exact: true }).click();
    await expect(
        profile.getByTestId("profile-emblems").getByRole("button")
    ).toHaveCount(0);
    await profile
        .getByRole("button", { name: "Hidden tracks", exact: true })
        .click();
    await expect(
        profile.getByTestId("profile-emblems").getByRole("button")
    ).toHaveCount(1);
    await expect(profile.getByTestId("profile-emblem-detail")).toContainText(
        "This secret reveals itself"
    );
    await expect(
        profile.getByTestId("profile-emblem-detail")
    ).not.toContainText("0 / 0");
    await profile.getByTestId("profile-emblem-detail").scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(prefix + "-secret.png") });
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
        )
    ).toBe(true);
}
