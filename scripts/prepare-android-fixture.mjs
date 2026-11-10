import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

if (process.env.GITHUB_ACTIONS !== "true")
    throw new Error(
        "The cleartext fixture overlay is restricted to isolated GitHub Actions builds"
    );
const directory = path.resolve(
    import.meta.dirname,
    "../apps/mobile/android/app/src/release"
);
const target = path.join(directory, "AndroidManifest.xml");
let exists = false;
try {
    await access(target);
    exists = true;
} catch {}
if (exists) throw new Error("Refusing to replace an existing release manifest");
await mkdir(directory, { recursive: true });
await writeFile(
    target,
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:usesCleartextTraffic="true" /></manifest>\n'
);
