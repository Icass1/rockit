/** Application policy, independent of OS quota and eviction decisions. */
export const OFFLINE_METADATA_POLICY = {
    maxPages: 100,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export function isOfflineMetadataPath(path: string): boolean {
    const pathname = path.split("?")[0];
    return (
        pathname === "/user" ||
        /^\/(?:user\/(?:session|library|queue|settings|navigation-pins|liked-media)|media\/(?:album|playlist|collection|song|artist|station)|lyrics|stats\/home|vocabulary)(?:\/|$)/.test(
            pathname
        )
    );
}
