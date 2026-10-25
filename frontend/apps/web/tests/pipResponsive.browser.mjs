/* eslint @typescript-eslint/explicit-function-return-type: "off" */
// Real PiP components with isolated state adapters, generated local video and Chromium.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const { buildHarness } = await import(
    new URL("pip/build.mjs", import.meta.url).href
);
const outputDir =
    process.env.PIP_REPORT_DIR ||
    fs.mkdtempSync(path.join(os.tmpdir(), "rockit-pip-"));
fs.mkdirSync(outputDir, { recursive: true });

const defaultSizes = [
    [160, 120],
    [220, 220],
    [259, 320],
    [260, 219],
    [260, 220],
    [299, 160],
    [300, 160],
    [320, 240],
    [320, 420],
    [360, 640],
    [480, 160],
    [640, 180],
    [480, 320],
    [480, 480],
    [640, 360],
    [800, 450],
    [1200, 300],
];
const sizes = process.env.PIP_TEST_SIZES
    ? JSON.parse(process.env.PIP_TEST_SIZES)
    : defaultSizes;
const mediaCases = process.env.PIP_MEDIA_CASES?.split(",") ?? [
    "song",
    "landscape",
    "portrait",
    "station",
    "empty",
];
(async () => {
    await buildHarness(outputDir);
    for (const [name, size] of [
        ["landscape", "256x144"],
        ["portrait", "144x256"],
    ]) {
        execFileSync(
            "ffmpeg",
            [
                "-nostdin",
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                "testsrc2=size=" + size + ":rate=1:duration=65",
                "-an",
                "-c:v",
                "libvpx-vp9",
                "-threads",
                "1",
                "-y",
                path.join(outputDir, name + ".webm"),
            ],
            { timeout: 30000 }
        );
    }
    const files = new Set([
        "index.html",
        "app.js",
        "style.css",
        "cover.jpg",
        "song-placeholder.png",
        "radio-placeholder.png",
        "landscape.webm",
        "portrait.webm",
    ]);
    const contentTypes = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        jpg: "image/jpeg",
        png: "image/png",
        webm: "video/webm",
    };
    const server = http.createServer((req, res) => {
        const name =
            new URL(req.url, "http://localhost").pathname.slice(1) ||
            "index.html";
        if (!files.has(name)) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.setHeader("Content-Type", contentTypes[name.split(".").at(-1)]);
        fs.createReadStream(path.join(outputDir, name)).pipe(res);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    server.unref();
    const baseUrl = "http://127.0.0.1:" + server.address().port;
    const browser = await chromium.launch({
        ...(process.env.PIP_CHROMIUM_PATH
            ? { executablePath: process.env.PIP_CHROMIUM_PATH }
            : {}),
        headless: true,
        args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
        viewport: { width: 320, height: 420 },
        reducedMotion: "reduce",
    });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const results = [];
    fs.mkdirSync(outputDir + "/shots", { recursive: true });
    for (const media of mediaCases) {
        await page.goto(baseUrl + "/?media=" + media);
        await page.locator(".pip-root").waitFor({ timeout: 5000 });
        for (const [width, height] of sizes) {
            await page.setViewportSize({ width, height });
            await page.mouse.move(width / 2, height - 20);
            await page.waitForTimeout(60);
            const layout = await page
                .locator(".pip-root")
                .getAttribute("data-pip-layout");
            let problem = null;
            try {
                const overflow = await page
                    .locator(".pip-panel")
                    .evaluate((el) => {
                        const controls = el.querySelector(".pip-controls-bar");
                        return [
                            ...controls.querySelectorAll(
                                ":scope > button,:scope > details > summary"
                            ),
                        ]
                            .filter((e) => e.checkVisibility())
                            .map((e) => {
                                const r = e.getBoundingClientRect();
                                return {
                                    name: e.getAttribute("aria-label"),
                                    x: r.x,
                                    y: r.y,
                                    w: r.width,
                                    h: r.height,
                                };
                            })
                            .filter(
                                (r) =>
                                    r.x < -0.5 ||
                                    r.y < -0.5 ||
                                    r.x + r.w > innerWidth + 0.5 ||
                                    r.y + r.h > innerHeight + 0.5
                            );
                    });
                assert.deepEqual(overflow, [], JSON.stringify(overflow));
                await page
                    .getByRole("button", { name: "Play", exact: true })
                    .click();
                assert.equal(
                    await page.evaluate(() => window.pipTest.playing.get()),
                    true
                );
                await page
                    .getByRole("button", { name: "Pause", exact: true })
                    .click();
                await page
                    .getByRole("button", { name: "Previous", exact: true })
                    .click();
                await page
                    .getByRole("button", { name: "Next", exact: true })
                    .click();
                const option = page.locator(
                    'summary[aria-label="More options"]'
                );
                const menuAction = async (name) => {
                    await option.click();
                    const button = page
                        .locator(".pip-menu")
                        .getByRole("button", { name, exact: true });
                    await button.click();
                };
                await menuAction("Shuffle");
                await menuAction("Shuffle");
                await menuAction("No repeat");
                await menuAction("Repeat one");
                await menuAction("Repeat all");
                if (media !== "empty") {
                    await menuAction("Like");
                    await menuAction("Unlike");
                }
                if (layout === "full" || layout === "sidebar") {
                    await page
                        .locator(
                            '.pip-controls-bar > button[aria-label=\"Shuffle\"]'
                        )
                        .click();
                    assert.equal(
                        await page.evaluate(() =>
                            window.pipTest.queueType.get()
                        ),
                        "RANDOM"
                    );
                    await page
                        .locator(
                            '.pip-controls-bar > button[aria-label=\"Shuffle\"]'
                        )
                        .click();
                }
                if (media === "song") {
                    await menuAction("Show vinyl");
                    await page.locator('[data-testid="pip-vinyl"]').waitFor();
                    await menuAction("Show cover");
                    await page.locator('[data-testid="pip-image"]').waitFor();
                    await menuAction("Show lyrics");
                    await page.locator('[data-testid="pip-lyrics"]').waitFor();
                    await page.locator('[data-lyric-index="1"]').click();
                    assert.equal(
                        await page.evaluate(() =>
                            window.pipTest.position.get()
                        ),
                        20
                    );
                    await page
                        .getByRole("button", {
                            name: "Close lyrics",
                            exact: true,
                        })
                        .click();
                }
                const slider = page.getByRole("slider");
                if (await slider.isVisible()) {
                    if (media === "station" || media === "empty")
                        assert.equal(await slider.isDisabled(), true);
                    else {
                        await slider.focus();
                        await slider.press("ArrowRight");
                        const before = await page.evaluate(() => ({
                            ...window.pipTest.calls,
                        }));
                        await slider.dispatchEvent("pointerdown");
                        await slider.dispatchEvent("pointercancel");
                        const after = await page.evaluate(() => ({
                            ...window.pipTest.calls,
                        }));
                        assert.equal(after.begin, before.begin + 1);
                        assert.equal(after.end, before.end + 1);
                    }
                }
                await option.click();
                await page.mouse.click(1, 1);
                assert.equal(
                    await page.locator("details").getAttribute("open"),
                    null
                );
                await option.click();
                await page.keyboard.press("Escape");
                assert.equal(
                    await page.locator("details").getAttribute("open"),
                    null
                );
                if (media === "landscape" || media === "portrait") {
                    const video = page.locator('[data-testid="pip-video"]');
                    await video.evaluate(async (e) => {
                        if (e.readyState < 1)
                            await new Promise((resolve, reject) => {
                                e.addEventListener("loadedmetadata", resolve, {
                                    once: true,
                                });
                                e.addEventListener("error", reject, {
                                    once: true,
                                });
                            });
                    });
                    assert.ok(await video.evaluate((e) => e.videoWidth > 0));
                    const rect = await video.boundingBox();
                    assert.ok(rect.width <= width && rect.height <= height);
                }
                await page.mouse.move(2, 2);
                await page.mouse.move(width / 2, height - 20);
                await page.screenshot({
                    path:
                        outputDir +
                        "/shots/" +
                        media +
                        "-" +
                        width +
                        "x" +
                        height +
                        ".png",
                });
            } catch (error) {
                problem = error.message;
                await page.screenshot({
                    path:
                        outputDir +
                        "/shots/FAIL-" +
                        media +
                        "-" +
                        width +
                        "x" +
                        height +
                        ".png",
                });
            }
            results.push({
                media,
                width,
                height,
                layout,
                passed: !problem,
                problem,
            });
            fs.writeFileSync(
                outputDir + "/results.json",
                JSON.stringify({ results, errors }, null, 2)
            );
            console.log(
                media,
                width + "x" + height,
                layout,
                problem ? "FAIL " + problem : "OK"
            );
            if (problem) break;
        }
    }
    const nativePage = await browser.newPage();
    await nativePage.goto(baseUrl + "/?native=1");
    await nativePage.getByRole("button", { name: "Open miniplayer" }).click();
    await nativePage.waitForFunction(() =>
        window.documentPictureInPicture?.window?.document.querySelector(
            "[data-pip-layout]"
        )
    );
    const native = await nativePage.evaluate(() => {
        const w = window.documentPictureInPicture.window;
        return {
            opened: !!w,
            styles: w.document.querySelectorAll("style[data-rockit-pip]")
                .length,
            width: w.innerWidth,
            height: w.innerHeight,
        };
    });
    assert.equal(native.styles, 1);
    await nativePage.evaluate(() =>
        window.documentPictureInPicture.window.document
            .querySelector('[aria-label="Play"]')
            .click()
    );
    assert.equal(
        await nativePage.evaluate(() => window.pipTest.playing.get()),
        true
    );
    await nativePage.evaluate(() =>
        window.documentPictureInPicture.window.close()
    );
    await nativePage.getByRole("button", { name: "Open miniplayer" }).waitFor();
    native.closed = true;
    await nativePage.close();
    fs.writeFileSync(
        outputDir + "/results.json",
        JSON.stringify({ results, errors, native }, null, 2)
    );
    console.log(
        "SUMMARY",
        results.filter((r) => r.passed).length + "/" + results.length,
        "errors",
        errors,
        "native",
        native
    );
    console.log("Results and screenshots:", outputDir);
    await browser.close();
    server.close();
    if (results.some((r) => !r.passed) || errors.length) process.exitCode = 1;
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
