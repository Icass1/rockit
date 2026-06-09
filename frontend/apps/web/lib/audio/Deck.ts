import { audioEngine } from "./AudioEngine";

export enum EDeckState {
    IDLE = "idle",
    LOADING = "loading",
    LOADED = "loaded",
    PLAYING = "playing",
    PAUSED = "paused",
    STOPPED = "stopped",
}

export class Deck {
    private _source: AudioBufferSourceNode | null = null;
    private _onEndedCallback?: () => void;
    private _gain: GainNode;
    private _state: EDeckState = EDeckState.IDLE;
    private _buffer: AudioBuffer | null = null;
    private _startTime: number = 0;
    private _pauseOffset: number = 0;
    private _playbackRate: number = 1;
    private _volume: number = 1;

    constructor() {
        this._gain = audioEngine.createGainNode();
        this._gain.gain.value = 0;
        this._connectToMaster();
    }

    private _connectToMaster(): void {
        const master = audioEngine.masterGain;
        if (master) {
            this._gain.connect(master);
        }
    }

    get state(): EDeckState {
        return this._state;
    }

    get gainNode(): GainNode {
        return this._gain;
    }

    get buffer(): AudioBuffer | null {
        return this._buffer;
    }

    get playbackRate(): number {
        return this._playbackRate;
    }

    get volume(): number {
        return this._volume;
    }

    load(buffer: AudioBuffer): void {
        this.reset();
        this._buffer = buffer;
        this._state = EDeckState.LOADED;
    }

    setOnEnded(callback: () => void): void {
        this._onEndedCallback = callback;
    }

play(atTime?: number, offset?: number): void {
        const ctx = audioEngine.context;
        if (!ctx || !this._buffer) return;
 
        // If an existing source is playing, stop it to avoid multiple sources
        if (this._source) {
            try {
                this._source.stop();
            } catch {
                /* ignore errors if already stopped */
            }
        }
 
        const time = atTime ?? ctx.currentTime;
        const startOffset = offset !== undefined ? offset : this._pauseOffset;
 
        this._source = ctx.createBufferSource();
        this._source.buffer = this._buffer;
        this._source.playbackRate.value = this._playbackRate;
        this._source.connect(this._gain);
 
        // Set up onended handler to notify when playback finishes
        this._source.onended = (): void => {
            if (this._state === EDeckState.PLAYING) {
                this._state = EDeckState.STOPPED;
                // Reset pause offset so replay starts at the beginning
                this._pauseOffset = 0;
                this._onEndedCallback?.();
            }
        };
 
        this._source.start(time, startOffset);
 
        this._startTime = time - startOffset;
        this._state = EDeckState.PLAYING;
    }

    stop(atTime?: number): void {
        if (!this._source || this._state === EDeckState.STOPPED) return;

        try {
            this._source.stop(atTime);
        } catch {
            /* source may have already stopped */
        }
        this._state = EDeckState.STOPPED;
        this._pauseOffset = 0;
    }

    pause(): void {
        if (!this._source || this._state !== EDeckState.PLAYING) return;

        const ctx = audioEngine.context;
        if (ctx) {
            this._pauseOffset = ctx.currentTime - this._startTime;
        }
        try {
            this._source.stop();
        } catch {
            /* source may have already stopped */
        }
        this._state = EDeckState.PAUSED;
    }

    setVolume(value: number, rampTime?: number): void {
        this._volume = Math.max(0, Math.min(1, value));
        const ctx = audioEngine.context;
        if (!ctx) {
            this._gain.gain.value = this._volume;
            return;
        }

        if (rampTime && rampTime > 0) {
            this._gain.gain.cancelScheduledValues(ctx.currentTime);
            this._gain.gain.linearRampToValueAtTime(
                this._volume,
                ctx.currentTime + rampTime
            );
        } else {
            this._gain.gain.setValueAtTime(this._volume, ctx.currentTime);
        }
    }

    setVolumeImmediate(value: number): void {
        this._volume = Math.max(0, Math.min(1, value));
        this._gain.gain.value = this._volume;
    }

    setPlaybackRate(rate: number, rampTime?: number): void {
        this._playbackRate = Math.max(0.05, Math.min(10, rate));
        if (!this._source) return;

        const ctx = audioEngine.context;
        if (!ctx) {
            this._source.playbackRate.value = this._playbackRate;
            return;
        }

        if (rampTime && rampTime > 0) {
            this._source.playbackRate.cancelScheduledValues(ctx.currentTime);
            this._source.playbackRate.linearRampToValueAtTime(
                this._playbackRate,
                ctx.currentTime + rampTime
            );
        } else {
            this._source.playbackRate.setValueAtTime(this._playbackRate, ctx.currentTime);
        }
    }

    getCurrentTime(): number {
        if (this._state === EDeckState.PAUSED) return this._pauseOffset;
        if (this._state !== EDeckState.PLAYING) return 0;

        const ctx = audioEngine.context;
        if (!ctx) return 0;
        return ctx.currentTime - this._startTime;
    }

    getDuration(): number {
        return this._buffer?.duration ?? 0;
    }

    reset(): void {
        if (this._source && this._state === EDeckState.PLAYING) {
            try {
                this._source.stop();
            } catch {
                /* source may have already stopped */
            }
        }
        this._source = null;
        this._buffer = null;
        this._state = EDeckState.IDLE;
        this._pauseOffset = 0;
        this._startTime = 0;
        this._gain.gain.value = 0;
    }

    disconnect(): void {
        try {
            this._gain.disconnect();
        } catch {
            /* ignore */
        }
    }

    reconnect(): void {
        this._connectToMaster();
    }
}
