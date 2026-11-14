/** Shared die, gemstone and frame geometry for SVG miniatures and the browser viewer. */
export const medalLeagues = [
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "legend",
] as const;
export const emblemSilhouettes: Record<string, string> = {
    bronze: "M40 6a34 34 0 1 1 0 68a34 34 0 1 1 0-68Z",
    silver: "M40 3L73 40L40 77L7 40Z",
    gold: "M40 3L66 15L77 40L66 65L40 77L14 65L3 40L14 15Z",
    platinum:
        "M40 2L50 24L63 17L56 31L78 40L56 49L63 63L50 56L40 78L30 56L17 63L24 49L2 40L24 31L17 17L30 24Z",
    diamond: "M22 6H58L75 29V49L58 74H22L5 49V29Z",
    legend: "M40 7L52 8L62 14L67 24L66 34L61 46L53 59L40 76L27 59L19 46L14 34L13 24L18 14L28 8Z",
};
const legendHalos = [
    "M20 2C8 14 3 29 8 43C12 55 21 67 32 76C19 61 12 46 12 32C11 19 15 9 20 2Z",
    "M60 2C72 14 77 29 72 43C68 55 59 67 48 76C61 61 68 46 68 32C69 19 65 9 60 2Z",
];
const diamondHalos = [
    "M13 12L1 31V49L13 68L8 47V33Z",
    "M67 12L79 31V49L67 68L72 47V33Z",
];
export function medalDesign(league: string) {
    const safe = medalLeagues.find((value) => value === league) ?? "gold";
    return {
        league: safe,
        die: emblemSilhouettes[safe],
        gemstone:
            safe === "gold"
                ? "M40 7L70 23V57L40 74L10 57V23Z"
                : safe === "platinum"
                  ? "M40 12L68 40L40 68L12 40Z"
                  : emblemSilhouettes[safe],
        jewel: safe !== "bronze" && safe !== "silver",
        halos:
            safe === "legend"
                ? legendHalos
                : safe === "diamond"
                  ? diamondHalos
                  : [],
        scales:
            safe === "diamond"
                ? [1, 0.96, 0.72, 0.4]
                : safe === "gold"
                  ? [1, 0.84, 0.56]
                  : safe === "platinum"
                    ? [1, 0.76, 0.2]
                    : [1, 0.985, 0.36],
        depths:
            safe === "diamond"
                ? [0.13, 0.17, 0.28, 0.42]
                : safe === "gold"
                  ? [0.13, 0.21, 0.31]
                  : safe === "platinum"
                    ? [0.13, 0.25, 0.4]
                    : [0.13, 0.16, 0.43],
    };
}

/** Linear-only gem contours: the silhouette and each cut use the same vertices. */
export function medalGemVertices(
    league: string
): ReadonlyArray<readonly [number, number]> {
    if (!medalDesign(league).jewel) return [];
    return Array.from(
        medalDesign(league).gemstone.matchAll(/[MLHVZ]|-?\d+(?:\.\d+)?/g)
    ).reduce<{ points: [number, number][]; command: string; values: number[] }>(
        (state, match) => {
            const token = match[0];
            if (/^[MLHVZ]$/.test(token)) {
                state.command = token;
                return state;
            }
            const value = Number(token);
            if (state.command === "H")
                state.points.push([value, state.points.at(-1)![1]]);
            else if (state.command === "V")
                state.points.push([state.points.at(-1)![0], value]);
            else {
                state.values.push(value);
                if (state.values.length === 2) {
                    state.points.push([state.values[0], state.values[1]]);
                    state.values = [];
                }
            }
            return state;
        },
        { points: [], command: "", values: [] }
    ).points;
}
