/** @param {string | undefined} packageId @param {string | undefined} fingerprints */
export function androidAssociation(packageId, fingerprints) {
    if (!packageId && !fingerprints) return [];
    if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(packageId ?? ""))
        throw new Error("A valid Android application ID is required");
    const list = (fingerprints ?? "")
        .split(",")
        .map((value) => value.trim().toUpperCase());
    if (
        !list.length ||
        list.some((value) => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))
    ) {
        throw new Error(
            "Signing certificate fingerprints must be SHA-256, colon-separated hexadecimal"
        );
    }
    return [
        {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
                namespace: "android_app",
                package_name: packageId,
                sha256_cert_fingerprints: [...new Set(list)],
            },
        },
    ];
}
