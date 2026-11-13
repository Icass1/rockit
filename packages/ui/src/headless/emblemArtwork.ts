import type { getTheme } from "@rockit/theme";

// Original RockIt! die and engravings, shared by the browser and native SVG adapter.
const die =
    "M36 4Q40 2 44 4L65 16Q69 18 69 23V49Q69 54 65 56L44 68Q40 70 36 68L15 56Q11 54 11 49V23Q11 18 15 16Z";
const engravings: Record<string, string> = {
    orbit: '<ellipse cx="40" cy="35" rx="25" ry="15" transform="rotate(-32 40 35)" stroke-dasharray="38 7"/>',
    groove: '<circle cx="40" cy="35" r="23" stroke-opacity=".6"/><circle cx="40" cy="35" r="20" stroke-opacity=".35"/>',
    ignition:
        '<path d="m29 18 4-6m14 6-4-6M20 30l-4-2m44 2 4-2" stroke-width="1.5"/>',
    longplay:
        '<path d="M19 28v14m4-19v24m34-24v24m4-19v14" stroke-width="1.5"/>',
    atlas: '<path d="m40 11 3 5-3 5-3-5ZM18 39l4-4-4-4m44 8-4-4 4-4"/><path d="M25 18Q40 10 55 18" stroke-dasharray="1 4"/>',
    voyager:
        '<path d="m24 20 2-5 2 5 5 2-5 2-2 5-2-5-5-2Zm31 21 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z"/><path d="m47 14 9 6" stroke-dasharray="1 3"/>',
};
const inks = {
    orbit: "emblem-discovery",
    groove: "emblem-community",
    ignition: "emblem-listening",
    longplay: "emblem-collection",
    atlas: "emblem-activity",
    voyager: "emblem-mastery",
} as const;

/** Only trusted theme values and allowlisted artwork enter the SVG, never API text. */
export function emblemArtwork(
    colors: ReturnType<typeof getTheme>,
    variant: string,
    earned: boolean,
    id: string
): string {
    const color = (part: "highlight" | "metal" | "shadow" | "face") =>
        earned ? colors[`medal-${part}`] : colors[`medal-muted-${part}`];
    const safeVariant = Object.hasOwn(inks, variant)
        ? (variant as keyof typeof inks)
        : "ignition";
    const ink = earned ? colors[inks[safeVariant]] : colors["muted-foreground"];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none"><defs>
    <linearGradient id="metal-${id}" x1="15" y1="4" x2="64" y2="68" gradientUnits="userSpaceOnUse"><stop stop-color="${color("highlight")}"/><stop offset=".28" stop-color="${color("metal")}"/><stop offset=".52" stop-color="${color("highlight")}"/><stop offset="1" stop-color="${color("shadow")}"/></linearGradient>
    <linearGradient id="enamel-${id}" x1="24" y1="12" x2="55" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="${ink}" stop-opacity=".36"/><stop offset="1" stop-color="${ink}" stop-opacity=".07"/></linearGradient></defs>
    <path d="${die}" transform="translate(0 3)" fill="${color("shadow")}"/><path d="${die}" fill="url(#metal-${id})"/>
    <path d="${die}" transform="translate(4.8 4.32) scale(.88)" fill="${color("face")}" stroke="${color("shadow")}" stroke-width=".8"/>
    <path d="${die}" transform="translate(6.4 5.76) scale(.84)" fill="url(#enamel-${id})" stroke="${ink}" stroke-opacity=".55" stroke-width=".7"/>
    <g stroke="${ink}" stroke-linecap="round">${engravings[safeVariant]}</g>
    <path d="M21 48q-6-7-4-16m42 16q6-7 4-16" stroke="${color("highlight")}" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>
    <path d="m28 58 12 7 12-7" stroke="${color("highlight")}" stroke-opacity=".6" stroke-linecap="round"/></svg>`;
}
