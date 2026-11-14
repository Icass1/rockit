import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/frontend/browser",
    outputDir: ".test-build/frontend/browser",
    workers: 1,
    timeout: 60000,
    retries: process.env.CI ? 1 : 0,
    reporter: [
        ["list"],
        ["json", { outputFile: ".test-build/frontend/browser-results.json" }],
        [
            "html",
            { outputFolder: ".test-build/frontend/report", open: "never" },
        ],
    ],
    webServer: [
        {
            command:
                "node node_modules/tsx/dist/cli.mjs --tsconfig tests/frontend/tsconfig.json tests/frontend/fixtures/serve.ts",
            url: "http://127.0.0.1:18899/__fixture/health",
            reuseExistingServer: process.env.REUSE_FRONTEND_SERVERS === "1",
            timeout: 30000,
        },
        {
            command: "node scripts/serve-mobile.mjs",
            url: "http://127.0.0.1:13001/login",
            reuseExistingServer: process.env.REUSE_FRONTEND_SERVERS === "1",
            timeout: 30000,
        },
        {
            command: "node node_modules/next/dist/bin/next start --port 13000",
            cwd: "apps/web",
            url: "http://127.0.0.1:13000/login",
            reuseExistingServer: process.env.REUSE_FRONTEND_SERVERS === "1",
            timeout: 30000,
        },
    ],
    use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
    projects: [
        {
            name: "desktop-chromium",
            testMatch: /desktop.*\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                launchOptions: {
                    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
                    args: ["--enable-unsafe-swiftshader"],
                },
            },
        },
        {
            name: "android-browser",
            testMatch: /mobile.*\.spec\.ts/,
            use: {
                ...devices["Pixel 7"],
                defaultBrowserType: "chromium",
                launchOptions: {
                    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
                    args: ["--enable-unsafe-swiftshader"],
                },
            },
        },
        {
            name: "ios-webkit",
            testMatch: /mobile.*\.spec\.ts/,
            use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" },
        },
    ],
});
