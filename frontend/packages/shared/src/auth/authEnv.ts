export function isDevFakeMode(): boolean {
    return process.env.EXPO_PUBLIC_FAKE_AUTH === "true";
}
