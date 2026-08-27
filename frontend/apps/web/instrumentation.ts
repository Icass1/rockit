const kPatched = Symbol.for("rockit.insecureTlsPatched");

function getInsecureHosts(): Set<string> {
    const hosts = new Set<string>();

    const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (backendUrl) {
        try {
            hosts.add(new URL(backendUrl).host.toLowerCase());
        } catch {}
    }

    for (const entry of (process.env.INSECURE_TLS_HOSTS || "").split(",")) {
        const value = entry.trim();
        if (!value) continue;
        hosts.add(value.toLowerCase());
    }

    return hosts;
}

export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    const globals = globalThis as unknown as Record<symbol, boolean>;
    if (globals[kPatched]) {
        return;
    }

    const insecureHosts = getInsecureHosts();
    if (insecureHosts.size === 0) {
        return;
    }
    globals[kPatched] = true;

    const dynamicImport = new Function(
        "specifier",
        "return import(specifier)"
    ) as (specifier: string) => Promise<{ default: typeof import("node:tls") }>;
    const imported = await dynamicImport("node:tls");
    const tls = imported.default ?? (imported as unknown as typeof import("node:tls"));
    const originalConnect = tls.connect.bind(tls);

    tls.connect = ((...args: unknown[]) => {
        const index = args.findIndex(
            (arg) =>
                typeof arg === "object" && arg !== null && !Array.isArray(arg)
        );
        if (index !== -1) {
            const options = args[index] as Record<string, unknown>;
            const host =
                options.servername ?? options.host ?? options.hostname;
            if (
                typeof host === "string" &&
                insecureHosts.has(host.toLowerCase())
            ) {
                args[index] = { ...options, rejectUnauthorized: false };
            }
        }
        return originalConnect(...(args as Parameters<typeof tls.connect>));
    }) as typeof tls.connect;
}
