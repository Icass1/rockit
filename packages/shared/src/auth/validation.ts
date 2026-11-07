/** Portable validation returns vocabulary keys; renderers choose the language. */
export function validateUsername(
    value: string
): "MOBILE_USERNAME_LENGTH" | "MOBILE_USERNAME_CHARACTERS" | null {
    if (!value) return null;
    if (value.length < 3 || value.length > 30) return "MOBILE_USERNAME_LENGTH";
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) return "MOBILE_USERNAME_CHARACTERS";
    return null;
}
