import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { build } from "esbuild";

const { createManifest } = await import(
    new URL("../../android-pwa/configure.mjs", import.meta.url).href
);
const { androidAssociation } = await import(
    new URL("../config/androidAssociation.mjs", import.meta.url).href
);
const { resolveClientTarget } = await import(
    new URL("../config/clientTarget.mjs", import.meta.url).href
);

const fingerprint = Array(32).fill("AB").join(":");

test("dedicated clients have isolated outputs and static shell entries", () => {
    assert.equal(resolveClientTarget().distDir, ".next");
    assert.equal(resolveClientTarget("mobile").shell, "shells/MobileShell.tsx");
    assert.equal(
        resolveClientTarget("desktop").shell,
        "shells/DesktopShell.tsx"
    );
    assert.notEqual(
        resolveClientTarget("mobile").distDir,
        resolveClientTarget("desktop").distDir
    );
    assert.throws(() => resolveClientTarget("ios"));
});

test("association requires a complete exact signing identity; disabled is empty", () => {
    assert.deepEqual(androidAssociation(), []);
    assert.throws(() => androidAssociation("org.rockit.pilot"));
    assert.throws(() => androidAssociation(undefined, fingerprint));
    assert.throws(() => androidAssociation("invalid", fingerprint));
    assert.throws(() => androidAssociation("org.rockit.pilot", "fake"));
    const links = androidAssociation(
        "org.rockit.pilot",
        fingerprint + "," + fingerprint
    );
    assert.equal(links[0].target.package_name, "org.rockit.pilot");
    assert.deepEqual(links[0].target.sha256_cert_fingerprints, [fingerprint]);
});

test("wrapper accepts only HTTPS origins and explicit signing configuration", () => {
    const environment = {
        ROCKIT_MOBILE_ORIGIN: "https://mobile.music.example",
        ROCKIT_ANDROID_PACKAGE_ID: "org.rockit.pilot",
        ROCKIT_ANDROID_CERT_SHA256: fingerprint,
        ROCKIT_ANDROID_KEYSTORE: "/tmp/test-only.jks",
        ROCKIT_ANDROID_KEY_ALIAS: "pilot",
    };
    const manifest = createManifest(environment);
    assert.equal(
        manifest.webManifestUrl,
        "https://mobile.music.example/manifest.webmanifest"
    );
    assert.equal(manifest.fallbackType, "customtabs");
    assert.equal(manifest.minSdkVersion, 29);
    assert.deepEqual(manifest.additionalTrustedOrigins, []);
    for (const origin of [
        "http://mobile.music.example",
        "https://a:b@mobile.music.example",
        "https://mobile.music.example/path",
        "https://mobile.music.example?x=1",
    ]) {
        assert.throws(() =>
            createManifest({ ...environment, ROCKIT_MOBILE_ORIGIN: origin })
        );
    }
    assert.throws(() =>
        createManifest({ ...environment, ROCKIT_ANDROID_VERSION_CODE: "-1" })
    );
});

test("mobile and desktop shell graphs cannot pull in each other's chrome", async () => {
    for (const target of ["mobile", "desktop"]) {
        const config = resolveClientTarget(target);
        const result = await build({
            entryPoints: [
                new URL(`../components/Layout/${config.shell}`, import.meta.url)
                    .pathname,
            ],
            bundle: true,
            outdir: "/tmp/rockit-client-targets-fixture",
            write: false,
            metafile: true,
            tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
            external: [
                "react",
                "react-dom",
                "react-dom/*",
                "next/*",
                "@rockit/shared",
                "@rockit/shared/*",
            ],
            plugins: [
                {
                    name: "runtime-boundary",
                    setup(builder) {
                        builder.onResolve(
                            { filter: /^@\/lib\/rockit\/rockIt$/ },
                            () => ({ path: "runtime", namespace: "fixture" })
                        );
                        builder.onLoad(
                            { filter: /.*/, namespace: "fixture" },
                            () => ({
                                contents: "export const rockIt = {};",
                                loader: "js",
                            })
                        );
                    },
                },
            ],
        });
        const inputs = Object.keys(result.metafile.inputs).join("\n");
        const unexpected =
            target === "mobile" ? "DesktopChrome.tsx" : "MobileChrome.tsx";
        assert.ok(!inputs.includes(unexpected), unexpected);
    }
    const layout = readFileSync(
        new URL("../components/Layout/AppClientLayout.tsx", import.meta.url),
        "utf8"
    );
    assert.ok(layout.includes('from "@/components/Layout/ClientShell"'));
    assert.ok(!layout.includes('from "@/components/PlayerUI'));
});
