import type { getTheme } from "@rockit/theme";
import {
    emblemFamilyMarks,
    emblemFamilyPlacement,
    emblemFamilyVariant,
} from "@rockit/ui/headless/emblemFamilies";
import {
    emblemSilhouettes,
    medalDesign,
    medalGemVertices,
} from "@rockit/ui/headless/medalShapes";

export { emblemSilhouettes } from "@rockit/ui/headless/medalShapes";

export function emblemPalette(
    colors: ReturnType<typeof getTheme>,
    league: string,
    earned: boolean
) {
    const safeLeague = Object.hasOwn(emblemSilhouettes, league)
        ? league
        : "gold";
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

export const emblemInks = {
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
    morning: "emblem-activity",
    midday: "emblem-activity",
    afternoon: "emblem-activity",
    evening: "emblem-activity",
    monday: "emblem-activity",
    tuesday: "emblem-activity",
    wednesday: "emblem-activity",
    thursday: "emblem-activity",
    friday: "emblem-activity",
    saturday: "emblem-activity",
    sunday: "emblem-activity",
    winter: "emblem-activity",
    spring: "emblem-activity",
    summer: "emblem-activity",
    autumn: "emblem-activity",
    new_year: "emblem-mastery",
    leap_day: "emblem-mastery",
    music_day: "emblem-mastery",
    halloween: "emblem-mastery",
    year_end: "emblem-mastery",
    months_active: "emblem-activity",
    years_active: "emblem-mastery",
    weeks_active: "emblem-activity",
    all_hours: "emblem-discovery",
    all_weekdays: "emblem-discovery",
    music_months: "emblem-discovery",
    repeats: "emblem-listening",
    favorites: "emblem-listening",
    deep_rotation: "emblem-listening",
    library_songs: "emblem-collection",
    library_albums: "emblem-collection",
    library_artists: "emblem-collection",
    library_playlists: "emblem-collection",
    library_radios: "emblem-collection",
    library_videos: "emblem-collection",
    library_total: "emblem-collection",
    library_diversity: "emblem-collection",
    share_reach: "emblem-community",
    shared_discoveries: "emblem-community",
    recommendations_received: "emblem-community",
    curators: "emblem-community",
    sharing_days: "emblem-community",
    album_shares: "emblem-community",
    artist_shares: "emblem-community",
    playlist_shares: "emblem-community",
    radio_shares: "emblem-community",
    video_shares: "emblem-community",
    song_shares: "emblem-community",
} as const;

/** Trusted geometry/theme values only; API text never enters SVG markup. */
export function emblemArtwork(
    colors: ReturnType<typeof getTheme>,
    variant: string,
    earned: boolean,
    id: string,
    league = "gold",
    scope?: string
): string {
    const design = medalDesign(league),
        palette = emblemPalette(colors, design.league, earned);
    const safeVariant = emblemFamilyVariant(variant, scope);
    const ink = earned
        ? colors[emblemInks[safeVariant]]
        : colors["muted-foreground"];
    const gem = earned
        ? colors[`medal-${design.league}-gem`]
        : colors["medal-muted-metal"];
    const transform = (scale: number) =>
        `translate(40 40) scale(${scale}) translate(-40 -40)`;
    const outline = design.die;
    const facets = design.jewel
        ? medalGemVertices(design.league)
              .map((point, index, points) => {
                  const next = points[(index + 1) % points.length],
                      table = design.scales.at(-1)!;
                  const inner = (p: readonly [number, number]) => [
                      40 + (p[0] - 40) * table,
                      40 + (p[1] - 40) * table,
                  ];
                  return `<path d="M${point.join(" ")}L${next.join(" ")}L${inner(next).join(" ")}L${inner(point).join(" ")}Z" fill="${index % 3 === 0 ? palette.highlight : index % 3 === 1 ? gem : palette.shadow}" fill-opacity="${index % 3 === 0 ? 0.55 : 0.8}"/>`;
              })
              .join("")
        : "";
    const field = design.jewel
        ? `<g transform="${transform(0.91)}"><path d="${design.gemstone}" fill="${gem}"/>${facets}<path d="${design.gemstone}" transform="${transform(design.scales.at(-1)!)}" fill="url(#gem-${id})"/></g>`
        : `<path d="${outline}" transform="${transform(0.83)}" fill="${palette.face}"/><path d="${outline}" transform="${transform(0.8)}" fill="url(#metal-${id})" fill-opacity=".55"/>`;
    const placement = emblemFamilyPlacement(design.league);
    const mark = `<g transform="translate(${placement.centerX} ${placement.centerY}) scale(${placement.scale}) translate(-16 -16)" fill-rule="evenodd"><path d="${emblemFamilyMarks[safeVariant]}" transform="translate(0 1)" fill="${palette.shadow}"/><path d="${emblemFamilyMarks[safeVariant]}" fill="${palette.highlight}"/></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none"><defs>
    <linearGradient id="metal-${id}" x1="10" y1="4" x2="66" y2="75" gradientUnits="userSpaceOnUse"><stop stop-color="${palette.highlight}"/><stop offset=".25" stop-color="${palette.metal}"/><stop offset=".5" stop-color="${palette.highlight}"/><stop offset=".72" stop-color="${palette.metal}"/><stop offset="1" stop-color="${palette.shadow}"/></linearGradient>
    <linearGradient id="gem-${id}" x1="20" y1="12" x2="57" y2="66" gradientUnits="userSpaceOnUse"><stop stop-color="${gem}"/><stop offset=".5" stop-color="${palette.face}"/><stop offset="1" stop-color="${ink}"/></linearGradient>
</defs>
    ${design.halos.map((path) => `<path d="${path}" fill="url(#metal-${id})"/>`).join("")}
    <path d="${outline}" transform="translate(0 1)" fill="${palette.shadow}"/><path d="${outline}" fill="url(#metal-${id})"/>
    <path d="${outline}" transform="${transform(0.94)}" fill="${palette.face}"/>
    ${field}${mark}</svg>`;
}
