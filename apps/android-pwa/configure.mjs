import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { androidAssociation } from "../web/config/androidAssociation.mjs";

export function createManifest(environment) {
    const origin = new URL(environment.ROCKIT_MOBILE_ORIGIN ?? "");
    if (
        origin.protocol !== "https:" ||
        origin.username ||
        origin.password ||
        origin.pathname !== "/" ||
        origin.search ||
        origin.hash
    ) {
        throw new Error("ROCKIT_MOBILE_ORIGIN must be a bare HTTPS origin");
    }
    const packageId = environment.ROCKIT_ANDROID_PACKAGE_ID;
    const association = androidAssociation(
        packageId,
        environment.ROCKIT_ANDROID_CERT_SHA256
    );
    if (!association.length)
        throw new Error(
            "An explicit pilot package and signing certificate are required"
        );
    const keystore = environment.ROCKIT_ANDROID_KEYSTORE;
    const alias = environment.ROCKIT_ANDROID_KEY_ALIAS;
    if (!keystore || !alias)
        throw new Error(
            "Configure the keystore path and key alias; do not commit private keys"
        );
    const version = Number(environment.ROCKIT_ANDROID_VERSION_CODE ?? 1);
    if (!Number.isSafeInteger(version) || version < 1)
        throw new Error("Version code must be a positive integer");
    return {
        packageId,
        host: origin.host,
        name: "RockIt!",
        launcherName: "RockIt!",
        startUrl: "/",
        display: "standalone",
        orientation: "default",
        themeColor: "#000000",
        backgroundColor: "#000000",
        navigationColor: "#000000",
        navigationColorDark: "#000000",
        themeColorDark: "#000000",
        navigationDividerColor: "#000000",
        navigationDividerColorDark: "#000000",
        iconUrl: `${origin.origin}/logo-512.png`,
        webManifestUrl: `${origin.origin}/manifest.webmanifest`,
        enableNotifications: false,
        enableSiteSettingsShortcut: true,
        splashScreenFadeOutDuration: 300,
        appVersion: environment.ROCKIT_ANDROID_VERSION_NAME ?? "1.0.0",
        appVersionCode: version,
        minSdkVersion: 29,
        fallbackType: "customtabs",
        signingKey: { path: resolve(keystore), alias },
        additionalTrustedOrigins: [],
        fingerprints: environment.ROCKIT_ANDROID_CERT_SHA256.split(",").map(
            (value) => ({ value: value.trim().toUpperCase() })
        ),
    };
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
    const manifest = createManifest(process.env);
    const output = resolve(process.argv[2] ?? "apps/android-pwa/.generated");
    await mkdir(output, { recursive: true });
    await writeFile(
        resolve(output, "twa-manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n"
    );
    await writeFile(
        resolve(output, "assetlinks.json"),
        JSON.stringify(
            androidAssociation(
                process.env.ROCKIT_ANDROID_PACKAGE_ID,
                process.env.ROCKIT_ANDROID_CERT_SHA256
            ),
            null,
            2
        ) + "\n"
    );
    process.stdout.write(
        `Android wrapper configuration written to ${output}\n`
    );
}
