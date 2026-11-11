const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
];
export function featuredArtworkPath(kind: string, now = new Date()): string {
    if (kind !== "last-month") return "/rockit-background.png";
    return `/recap-covers/${months[(now.getMonth() + 11) % 12]}.png`;
}
