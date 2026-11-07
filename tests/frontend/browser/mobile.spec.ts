import { expect, test } from "@playwright/test";

const mobile = "http://127.0.0.1:13001";
const backend = "http://127.0.0.1:18899";

test.beforeEach(async ({ request }) => {
    await request.post(backend + "/__fixture/reset");
});
test.afterEach(async ({ request }, info) => {
    const response = await request.get(backend + "/__fixture/calls");
    const result = await response.json();
    await info.attach("mock-backend-requests-and-timings", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
    });
    expect(result.unhandled).toEqual([]);
    expect(result.protocolErrors).toEqual([]);
});

test("mobile shell authenticates with a browser cookie without exposing a native session token", async ({
    page,
    context,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(mobile + "/login");
    await page.getByPlaceholder("Username").fill("fixture");
    await page
        .getByPlaceholder("Password", { exact: true })
        .fill("fixture-password");
    const loggedIn = page.waitForResponse(backend + "/auth/login");
    await page
        .getByText(/^log in$/i)
        .last()
        .click();
    expect((await (await loggedIn).json()).sessionId).toBeNull();
    await expect(
        page.getByText("Canción de prueba — Snow").first()
    ).toBeVisible();
    expect(
        (await context.cookies()).find((cookie) => cookie.name === "session_id")
            ?.httpOnly
    ).toBe(true);
    expect(errors).toEqual([]);
});

test("finds playlist-only songs and plays one song without queueing its album", async ({
    page,
    context,
    request,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await page.goto(mobile + "/library");
    await expect(page.getByText("Fixture Album")).toBeVisible();
    const input = page.getByPlaceholder(/search.*library/i);
    await input.fill("Playlist exclusive");
    await expect(page.getByText("Playlist exclusive").first()).toBeVisible();
    await page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .first()
        .click();
    await expect(
        page.getByRole("button", { name: "Pause", exact: true }).first()
    ).toBeVisible();
    await expect
        .poll(
            async () =>
                (
                    await (
                        await request.get(backend + "/user/queue", {
                            headers: { Cookie: "session_id=fixture" },
                        })
                    ).json()
                ).total
        )
        .toBe(1);
    await page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .last()
        .click();
    await page.getByText("Queue", { exact: true }).last().click();
    await expect(page.getByText("1 Songs", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
});

test("bounds search pages and updates all visible surfaces when the saved theme changes", async ({
    page,
    context,
    request,
}) => {
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await page.goto(mobile + "/library");
    await page.getByPlaceholder(/search.*library/i).fill("Fixture");
    await expect(
        page.getByRole("button", { name: "Load more", exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect
        .poll(async () => {
            const data = await (
                await request.get(backend + "/__fixture/calls")
            ).json();
            return data.calls.filter((call: { path: string }) =>
                call.path.startsWith("/user/library/songs/search")
            ).length;
        })
        .toBe(2);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: "Light", exact: true }).click();
    await expect(
        page.getByRole("radio", { name: "Light", exact: true })
    ).toBeChecked();
    await expect(
        page.getByRole("radio", { name: "Light", exact: true })
    ).toHaveCSS("background-color", "rgb(255, 255, 255)");
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByText("Log Out", { exact: true }).last().click();
    await expect(page.getByPlaceholder("Username")).toBeVisible();
    expect(
        (await context.cookies()).filter(
            (cookie) => cookie.name === "session_id"
        )
    ).toEqual([]);
});

test("shows a failed search and recovers with an explicit retry", async ({
    page,
    context,
    request,
}) => {
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/user/library/songs/search", status: 503 },
    });
    await page.goto(mobile + "/library");
    await page.getByPlaceholder(/search.*library/i).fill("Playlist exclusive");
    await expect(
        page.getByRole("button", { name: /Error.*Retry/ })
    ).toBeVisible();
    await request.post(backend + "/__fixture/fault", {
        data: { path: "/user/library/songs/search" },
    });
    await page.getByRole("button", { name: /Error.*Retry/ }).click();
    await expect(
        page.getByText("Playlist exclusive", { exact: true }).first()
    ).toBeVisible();
});

test("keeps the installed shell and private library metadata available after the network disappears", async ({
    page,
    context,
}) => {
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await page.goto(mobile + "/library");
    await expect(
        page.getByText("Fixture Album", { exact: true }).first()
    ).toBeVisible();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller)
            await new Promise<void>((resolve) =>
                navigator.serviceWorker.addEventListener(
                    "controllerchange",
                    () => resolve(),
                    { once: true }
                )
            );
    });
    await page.getByPlaceholder(/search.*library/i).fill("Playlist exclusive");
    await expect(
        page.getByText("Playlist exclusive", { exact: true }).first()
    ).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const worker = (await navigator.serviceWorker.ready).active;
                if (!worker) return false;
                const loaded = performance
                    .getEntriesByType("resource")
                    .map((entry) => entry.name)
                    .filter(
                        (url) =>
                            new URL(url).origin === location.origin &&
                            new URL(url).pathname.startsWith("/_expo/static/")
                    );
                const stored = await Promise.all(
                    loaded.map((url) => caches.match(url))
                );
                return stored.every(Boolean);
            })
        )
        .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(
        page.getByText("Fixture Album", { exact: true }).first()
    ).toBeVisible();
    await page.getByPlaceholder(/search.*library/i).fill("Playlist exclusive");
    await expect(
        page.getByText("Playlist exclusive", { exact: true }).first()
    ).toBeVisible();
    await context.setOffline(false);
});

test("shares a playlist-only song from its long-press menu using the common account-scoped service", async ({
    page,
    context,
    request,
}) => {
    await context.addCookies([
        { name: "session_id", value: "fixture", url: backend, httpOnly: true },
    ]);
    await page.goto(mobile + "/library");
    await page.getByPlaceholder(/search.*library/i).fill("Playlist exclusive");
    const song = page
        .getByRole("button", { name: "Playlist exclusive", exact: true })
        .first();
    await song.hover();
    await page.mouse.down();
    try {
        await expect(
            page.getByRole("button", { name: "Share", exact: true })
        ).toBeVisible();
    } finally {
        await page.mouse.up();
    }
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page
        .getByRole("button", { name: "Fixture Friend", exact: true })
        .click();
    await page
        .getByLabel("Message (optional)")
        .fill("Canción para ti — déjà vu");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByText("Music shared", { exact: true })).toBeVisible();
    const result = await (
        await request.get(backend + "/__fixture/calls")
    ).json();
    expect(
        result.calls.find(
            (call: { path: string; method: string }) =>
                call.path === "/friends/share" && call.method === "POST"
        )?.body
    ).toEqual({
        recipientPublicId: "friend-1",
        mediaPublicId: "song-2",
        message: "Canción para ti — déjà vu",
    });
});
