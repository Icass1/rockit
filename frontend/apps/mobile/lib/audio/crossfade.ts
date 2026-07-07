// Crossfade settings shape retained for the settings UI. The unified player is
// single-deck, so these values are stored but do not drive a crossfade engine.

export interface CrossfadeSettings {
    durationMs: number;
    effect: "linear" | "equal_power" | "instant";
    skipDurationMs: number;
}

export const DEFAULT_CROSSFADE: CrossfadeSettings = {
    durationMs: 0,
    effect: "equal_power",
    skipDurationMs: 300,
};
