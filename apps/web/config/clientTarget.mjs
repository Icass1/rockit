/** Build-only entry selection. Invalid values must never fall back silently. */
export function resolveClientTarget(value = "responsive") {
    if (!["responsive", "desktop", "mobile"].includes(value)) {
        throw new Error(`Invalid ROCKIT_WEB_TARGET: ${value}`);
    }
    return {
        target: value,
        distDir: value === "responsive" ? ".next" : `.next-${value}`,
        shell:
            value === "mobile"
                ? "shells/MobileShell.tsx"
                : value === "desktop"
                  ? "shells/DesktopShell.tsx"
                  : "ClientShell.tsx",
    };
}
