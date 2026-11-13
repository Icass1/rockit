import type { getTheme } from "@rockit/theme";

// Original RockIt! die and engravings, shared by the browser and native SVG adapter.
const originalDie =
    "M36 4Q40 2 44 4L65 16Q69 18 69 23V49Q69 54 65 56L44 68Q40 70 36 68L15 56Q11 54 11 49V23Q11 18 15 16Z";
const silhouettes: Record<string, string> = {
    bronze: "M40 4a34 34 0 1 1 0 68a34 34 0 1 1 0-68Z",
    silver: "M15 7Q40 0 65 7V38Q65 59 40 74Q15 59 15 38Z",
    gold: originalDie,
    platinum:
        "M40 3L51 12L65 15L68 29L77 40L68 51L65 65L51 68L40 77L29 68L15 65L12 51L3 40L12 29L15 15L29 12Z",
    diamond: "M40 2L69 21L76 42L40 76L4 42L11 21Z",
    legend: "M10 11L24 19L40 3L56 19L70 11L66 45Q62 62 40 75Q18 62 14 45Z",
};

export function emblemPalette(
    colors: ReturnType<typeof getTheme>,
    league: string,
    earned: boolean
) {
    const safeLeague = Object.hasOwn(silhouettes, league) ? league : "gold";
    const palette = colors as Record<string, string>;
    return Object.fromEntries(
        ["highlight", "metal", "shadow", "face"].map((part) => [
            part,
            earned
                ? palette[`medal-${safeLeague}-${part}`]
                : palette[`medal-muted-${part}`],
        ])
    ) as Record<"highlight" | "metal" | "shadow" | "face", string>;
}

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
const extraEngravings: Record<string, string> = {
    flame: '<path d="M40 12C28 29 25 36 31 43C40 53 55 44 51 33L44 23L42 35C35 32 36 22 40 12Z"/>',
    companions:
        '<circle cx="32" cy="27" r="6"/><circle cx="49" cy="29" r="5"/><path d="M20 47Q21 34 32 35Q43 34 44 47M44 37Q57 36 59 47" stroke-width="2"/>',
    camera: '<rect x="20" y="23" width="32" height="25" rx="5"/><path d="m52 30 10-5v21l-10-5ZM32 29l11 7-11 7Z"/>',
    fusion: '<circle cx="33" cy="35" r="15"/><circle cx="48" cy="35" r="15"/><path d="m36 35 4 4 7-9" stroke-width="2"/>',
    calendar:
        '<rect x="21" y="20" width="38" height="32" rx="5"/><path d="M21 30h38M30 16v10m20-10v10m-20 14 7 6 14-13" stroke-width="2"/>',
    moon: '<path d="M48 15A21 21 0 1 0 62 43A19 19 0 0 1 48 15Z"/><path d="m23 15 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z"/>',
    sunrise:
        '<path d="M18 45h44M27 44a13 13 0 0 1 26 0M40 13v8M19 24l6 6m30 0 6-6M14 37h7m38 0h7" stroke-width="2"/>',
    weekend:
        '<path d="m17 24 23 8 23-8M17 24v24l23 8 23-8V24L40 16Z"/><path d="M40 32v24m-12-5V29m24-2v25M24 15l-4-6m35 7 5-6"/>',
    hourglass:
        '<path d="M25 15h30M25 55h30M29 15v10l11 10-11 10v10m22-40v10L40 35l11 10v10M31 48h18M31 22h18" stroke-width="2"/>',
    anniversary:
        '<path d="M20 45h40v10H20ZM24 35h32v10H24ZM29 25h22v10H29ZM40 15v10M38 11q2-8 4 0q-2 5-4 0Z"/>',
    artifact:
        '<path d="m40 10 21 13-7 27-14 8-14-8-7-27ZM19 23l21 13 21-13M40 36v22"/><path d="m40 18 7 9-7 4-7-4Z"/>',
};
Object.assign(engravings, extraEngravings);
const inks = {
    orbit: "emblem-discovery",
    groove: "emblem-community",
    ignition: "emblem-listening",
    longplay: "emblem-collection",
    atlas: "emblem-activity",
    voyager: "emblem-mastery",
    flame: "emblem-listening",
    companions: "emblem-community",
    camera: "emblem-activity",
    fusion: "emblem-discovery",
    calendar: "emblem-community",
    moon: "emblem-mastery",
    sunrise: "emblem-collection",
    weekend: "emblem-activity",
    hourglass: "emblem-collection",
    anniversary: "emblem-community",
    artifact: "emblem-mastery",
} as const;

/** Only trusted theme values and allowlisted artwork enter the SVG, never API text. */
export function emblemArtwork(
    colors: ReturnType<typeof getTheme>,
    variant: string,
    earned: boolean,
    id: string,
    league = "gold"
): string {
    const safeLeague = Object.hasOwn(silhouettes, league) ? league : "gold";
    const die = silhouettes[safeLeague];
    const palette = emblemPalette(colors, safeLeague, earned);
    const color = (part: keyof typeof palette) => palette[part];
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
    <g transform="translate(4 -4) scale(.9)" stroke="${ink}" stroke-linecap="round">${engravings[safeVariant]}</g>
    <path d="M21 48q-6-7-4-16m42 16q6-7 4-16" stroke="${color("highlight")}" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>
    ${safeLeague === "diamond" ? `<path d="m11 21 29 8 29-8M40 29v47M4 42h72" stroke="${color("highlight")}" stroke-opacity=".35"/>` : ""}
    ${safeLeague === "legend" ? `<path d="M10 49Q3 34 9 24m61 25q7-15 1-25M8 35l-5-4m6 12-6-2m69-6 5-4m-6 12 6-2" stroke="${color("metal")}" stroke-width="2"/>` : ""}
    <path d="m28 58 12 7 12-7" stroke="${color("highlight")}" stroke-opacity=".6" stroke-linecap="round"/></svg>`;
}
