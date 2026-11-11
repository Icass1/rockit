/** An explicit transport seek or an accepted native playback sample, in seconds. */
export interface PlaybackPosition {
    mediaPublicId: string;
    playbackId: string;
    kind: "progress" | "seek";
    timeFrom: number;
    timeTo: number;
    seeking: boolean;
}
