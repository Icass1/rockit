// Run after a production build. Both child servers use ephemeral localhost ports.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const web = fileURLToPath(new URL("../", import.meta.url));
const servers = [];
function start(args, environment, parsePort) {
    const child = spawn(process.execPath, args, {
        cwd: web,
        env: { ...process.env, ...environment },
        stdio: ["ignore", "pipe", "pipe"],
    });
    servers.push(child);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(
            () => reject(new Error("Fixture server startup timed out")),
            20000
        );
        let output = "";
        child.on("error", reject);
        child.on("exit", (code) => {
            clearTimeout(timeout);
            if (code) reject(new Error(`Fixture server exited: ${code}`));
        });
        child.stdout.on("data", (data) => {
            output += data.toString();
            const port = parsePort(output);
            if (port) {
                clearTimeout(timeout);
                resolve(port);
            }
        });
        // Drain diagnostic output without logging environment-specific server configuration.
        child.stderr.on("data", () => {});
    });
}
try {
    const backend = await start(["tests/fixtures/ssrBackend.mjs"], {}, (text) =>
        Number(text.match(/"port":(\d+)/)?.[1])
    );
    const frontend = await start(
        ["node_modules/next/dist/bin/next", "start", "-p", "0"],
        { BACKEND_INTERNAL_URL: `http://127.0.0.1:${backend}` },
        (text) => Number(text.match(/Local:\s+http:\/\/localhost:(\d+)/)?.[1])
    );
    const startTime = Date.now();
    const response = await fetch(`http://127.0.0.1:${frontend}/`, {
        headers: { cookie: "session_id=fixture" },
        signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let firstContentMs;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (firstContentMs === undefined && html.includes("SSR fixture song")) {
            firstContentMs = Date.now() - startTime;
            const state = await (
                await fetch(`http://127.0.0.1:${backend}/fixture/status`)
            ).json();
            assert.equal(
                state.discoveryCompleted,
                false,
                "Core content must stream before the slow provider finishes"
            );
        }
    }
    assert.match(html, /<html[^>]*lang="es"/);
    assert.match(html, /Biblioteca de prueba/);
    assert.match(html, /SSR fixture song/);
    assert.notEqual(firstContentMs, undefined);
    const state = await (
        await fetch(`http://127.0.0.1:${backend}/fixture/status`)
    ).json();
    for (const route of [
        "/user/session",
        "/stats/home",
        "/vocabulary/user",
        "/recommendation/for-you?external=false",
        "/recommendation/for-you?external=true",
    ])
        assert.equal(state.calls[route], 1, route);
    const login = await fetch(`http://127.0.0.1:${frontend}/login`);
    assert.equal(login.status, 200);
    const loginHtml = await login.text();
    assert.match(loginHtml, /<form/);
    assert.match(loginHtml, /id="login-username"/);
    assert.match(loginHtml, /id="login-password"/);
    assert.doesNotMatch(loginHtml, />LOG_IN<|>USERNAME<|>PASSWORD</);
    console.log(
        JSON.stringify(
            {
                passed: true,
                translatedServerHtml: true,
                coreContentBeforeDiscovery: true,
                deduplicatedServerRequests: true,
                nativeAuthForm: true,
                firstContentMs,
            },
            null,
            2
        )
    );
} finally {
    for (const server of servers.reverse()) server.kill("SIGTERM");
}
