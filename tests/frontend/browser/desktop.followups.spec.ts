import { expect, test } from "@playwright/test";
import { WebSocket } from "ws";

const app = "http://127.0.0.1:13000",
    api = "http://127.0.0.1:18899",
    headers = { Cookie: "session_id=fixture" };
test.beforeEach(async ({ request, context }) => {
    await request.post(api + "/__fixture/reset");
    await context.addCookies([
        { name: "session_id", value: "fixture", url: api, httpOnly: true },
    ]);
});
test("desktop Home renders the current session photo", async ({
    page,
    request,
}, testInfo) => {
    const session = await (
        await request.get(api + "/user/session", { headers })
    ).json();
    await request.post(api + "/__fixture/fault", {
        data: {
            path: "/user/session",
            body: { ...session, image: api + "/assets/artwork.svg" },
        },
    });
    await page.goto(app);
    await expect(
        page.locator(".cf-section").getByRole("img", { name: "fixture" })
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("desktop-home.png") });
});
test("queue insertion marker matches the before boundary persisted by an actual HTML drag", async ({
    page,
    request,
}, testInfo) => {
    const socket = new WebSocket("ws://127.0.0.1:18899/ws");
    await new Promise<void>((resolve) => socket.once("open", resolve));
    socket.send(
        JSON.stringify({
            type: "current_queue",
            queue: ["song-1", "song-2", "synthetic-0"].map(
                (mediaPublicId, i) => ({
                    mediaPublicId,
                    listPublicId: null,
                    queueMediaId: i + 1,
                    randomIndex: i,
                    sortedIndex: i,
                })
            ),
        })
    );
    await expect
        .poll(
            async () =>
                (
                    await (
                        await request.get(api + "/user/queue", { headers })
                    ).json()
                ).total
        )
        .toBe(3);
    socket.send(
        JSON.stringify({
            type: "current_media",
            currentTimeMs: 0,
            playbackId: "fixture-boundary",
            queueMediaId: 1,
            mediaPublicId: "song-1",
            queueType: "SORTED",
        })
    );
    await expect
        .poll(
            async () =>
                (
                    await (
                        await request.get(api + "/user/queue", { headers })
                    ).json()
                ).currentQueueMediaId
        )
        .toBe(1);
    socket.close();
    await page.goto(app + "/library");
    await page
        .getByRole("button", { name: "Show player", exact: true })
        .click();
    const rows = page.locator("[data-queue-media-id]");
    await expect(rows).toHaveCount(3);
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await rows.first().dispatchEvent("dragstart", { dataTransfer });
    const rect = (await rows.nth(2).boundingBox())!;
    await rows
        .nth(2)
        .dispatchEvent("dragover", { dataTransfer, clientY: rect.y + 2 });
    await expect(
        rows.nth(2).locator('[data-queue-insertion="before"]')
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("queue-insertion.png") });
    await rows.first().dispatchEvent("dragend", { dataTransfer });
    await rows.first().dragTo(rows.nth(2), { targetPosition: { x: 30, y: 3 } });
    await expect
        .poll(() =>
            rows.evaluateAll((nodes) =>
                nodes.map((node) => node.getAttribute("data-queue-media-id"))
            )
        )
        .toEqual(["2", "1", "3"]);
    await expect
        .poll(async () =>
            (
                await (
                    await request.get(api + "/user/queue", { headers })
                ).json()
            ).queue.map((item: { queueMediaId: number }) => item.queueMediaId)
        )
        .toEqual([2, 1, 3]);
});
