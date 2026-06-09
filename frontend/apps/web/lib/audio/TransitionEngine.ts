import { audioEngine } from "./AudioEngine";
import { Deck, EDeckState } from "./Deck";

export enum ETransitionProfile {
    CROSSFADE = "crossfade",
    BACKSPIN = "backspin",
    VINYL_STOP = "vinyl_stop",
    REVERB_OUT = "reverb_out",
    CUT = "cut",
}

export interface TransitionParams {
    profile: ETransitionProfile;
    durationMs: number;
    from: Deck;
    to: Deck;
}

export class TransitionEngine {
    private _isTransitioning = false;

    get isTransitioning(): boolean {
        return this._isTransitioning;
    }

    async execute(params: TransitionParams): Promise<void> {
        if (this._isTransitioning) return;
        if (params.to.state === EDeckState.IDLE) return;

        this._isTransitioning = true;

        try {
            switch (params.profile) {
                case ETransitionProfile.CROSSFADE:
                    this._crossfade(params);
                    break;
                case ETransitionProfile.BACKSPIN:
                    this._backspin(params);
                    break;
                case ETransitionProfile.VINYL_STOP:
                    this._vinylStop(params);
                    break;
                case ETransitionProfile.REVERB_OUT:
                    this._reverbOut(params);
                    break;
                case ETransitionProfile.CUT:
                    this._cut(params);
                    break;
            }

            await this._waitForTransition(params.durationMs);
        } finally {
            this._finalize(params);
        }
    }

    private _crossfade(params: TransitionParams): void {
        const { from, to, durationMs } = params;
        const durationSec = durationMs / 1000;
        const ctx = audioEngine.context;
        if (!ctx) return;

        const startTime = ctx.currentTime + 0.02;

        from.setVolume(0, durationSec);
        to.setVolume(1, durationSec);
        to.play(startTime);

        params.from.stop(startTime + durationSec + 0.05);
    }

    private _backspin(params: TransitionParams): void {
        const { from, to, durationMs } = params;
        const ctx = audioEngine.context;
        if (!ctx) return;

        const backspinDuration = Math.min(durationMs, 800) / 1000;
        const fadeStart = ctx.currentTime + 0.02;

        from.setPlaybackRate(5, backspinDuration);
        from.setVolume(0, backspinDuration + 0.2);
        from.stop(fadeStart + backspinDuration + 0.25);

        const toStart = fadeStart + backspinDuration * 0.4;
        to.setVolume(1, backspinDuration * 0.6);
        to.play(toStart);
    }

    private _vinylStop(params: TransitionParams): void {
        const { from, to, durationMs } = params;
        const ctx = audioEngine.context;
        if (!ctx) return;

        const stopDuration = Math.min(durationMs, 1000) / 1000;
        const startTime = ctx.currentTime + 0.02;

        from.setPlaybackRate(0.001, stopDuration);
        from.setVolume(0, stopDuration + 0.2);
        from.stop(startTime + stopDuration + 0.25);

        const toStart = startTime + stopDuration * 0.5;
        to.setVolume(1, stopDuration * 0.5);
        to.play(toStart);
    }

    private _reverbOut(params: TransitionParams): void {
        const { from, to, durationMs } = params;
        const ctx = audioEngine.context;
        if (!ctx) return;

        const reverbDuration = Math.min(durationMs, 2000) / 1000;
        const startTime = ctx.currentTime + 0.02;

        from.setVolume(0, reverbDuration);
        from.stop(startTime + reverbDuration + 0.1);

        to.setVolume(1, reverbDuration * 0.5);
        to.play(startTime + reverbDuration * 0.3);
    }

    private _cut(params: TransitionParams): void {
        const { from, to } = params;
        const ctx = audioEngine.context;
        if (!ctx) return;

        const startTime = ctx.currentTime + 0.01;

        from.stop(startTime);
        to.setVolumeImmediate(1);
        to.play(startTime);
    }

    private _waitForTransition(durationMs: number): Promise<void> {
        const waitMs = durationMs + 100;
        return new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    private _finalize(params: TransitionParams): void {
        const { from, to } = params;

        if (from.state !== EDeckState.STOPPED) {
            from.reset();
        }

        this._isTransitioning = false;
    }
}
