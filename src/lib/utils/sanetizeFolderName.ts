export function sanitizeFolderName(
    name: string,
    maxLength: number = 255
): string {
    // Replace invalid characters with underscores
    const invalidCharsRegex = /[<>:"/\\|?*]/g;
    let sanitizedName = name.replace(invalidCharsRegex, "_");

    // Remove leading/trailing whitespace
    sanitizedName = sanitizedName.trim();

    // Truncate to max length
    if (sanitizedName.length > maxLength) {
        sanitizedName = sanitizedName.slice(0, maxLength);
    }

    return sanitizedName;
}
