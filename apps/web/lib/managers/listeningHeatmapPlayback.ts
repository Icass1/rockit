import type { PlaybackPosition } from "@/models/interfaces/playbackPosition";
import type { ListeningHeatmapInterval } from "@/models/types/listeningHeatmap";

/** Mirrors the backend's intervals: seeking closes a pass and starts a new one. */
export class ListeningHeatmapPlayback {
    readonly completed: ListeningHeatmapInterval[] = [];
    active?: ListeningHeatmapInterval;
    private seeking = false;
    private playbackId?: string;
    private seekTarget?: number;

    constructor(
        private playing: boolean,
        currentTime: number
    ) {
        if (playing) this.start(currentTime);
    }

    private start(time: number): void {
        const ms = Math.max(0, time * 1000);
        this.active = { startMs: ms, endMs: ms };
    }

    private finish(): void {
        if (this.active && this.active.endMs > this.active.startMs)
            this.completed.push({ ...this.active });
        this.active = undefined;
    }

    setPlaying(playing: boolean, currentTime: number): void {
        this.playing = playing;
        if (playing && !this.seeking) {
            currentTime = this.seekTarget ?? currentTime;
            if (this.active && this.active.endMs !== currentTime * 1000)
                this.finish();
            if (!this.active) this.start(currentTime);
        }
    }

    observe(position: PlaybackPosition): void {
        if (
            this.playbackId !== undefined &&
            this.playbackId !== position.playbackId
        ) {
            this.finish();
            this.seeking = false;
            this.seekTarget = undefined;
        }
        this.playbackId = position.playbackId;
        if (position.kind === "seek") {
            if (this.active && !this.seeking)
                this.active.endMs = Math.max(
                    this.active.endMs,
                    position.timeFrom * 1000
                );
            this.finish();
            this.seeking = position.seeking;
            this.seekTarget = position.timeTo;
            if (this.playing && !this.seeking) this.start(position.timeTo);
            return;
        }
        if (!this.playing || this.seeking) return;
        this.seekTarget = undefined;
        if (this.active && position.timeTo * 1000 < this.active.endMs) {
            this.finish();
            this.start(position.timeTo);
        }
        if (!this.active) this.start(position.timeFrom);
        this.active!.endMs = Math.max(
            this.active!.startMs,
            position.timeTo * 1000
        );
    }

    get intervals(): ListeningHeatmapInterval[] {
        return this.active ? [...this.completed, this.active] : this.completed;
    }
}
