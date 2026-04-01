import type { AudioCore } from "./AudioCore";

export type CrossfadeEffect = "linear" | "equal_power" | "instant";

interface CrossfadeOptions {
    durationMs: number;
    effect: CrossfadeEffect;
    tickMs?: number;
}

const DEFAULT_TICK_MS = 50;

export class AudioCrossfade {
    private _core: AudioCore;
    private _cancelled = false;

    constructor(core: AudioCore) {
        this._core = core;
    }

    async crossfade(opts: CrossfadeOptions): Promise<void> {
        this._cancelActive();
        this._cancelled = false;

        const outDeck = this._core.activeDeck;
        const inDeck = this._core.inactiveDeck;
        const { durationMs, effect, tickMs = DEFAULT_TICK_MS } = opts;

        await this._core.setVolumeDeck(inDeck, 0);
        await this._core.playDeck(inDeck);

        const steps = Math.ceil(durationMs / tickMs);

        for (let step = 1; step <= steps && !this._cancelled; step++) {
            const t = Math.min(step / steps, 1);

            const volIn = this._getCurveValue(t, effect);
            const volOut = this._getCurveValue(1 - t, effect);

            await Promise.all([
                this._core.setVolumeDeck(inDeck, volIn),
                this._core.setVolumeDeck(outDeck, volOut),
            ]);

            if (step < steps) {
                await this._sleep(tickMs);
            }
        }

        if (!this._cancelled) {
            await this._core.pauseDeck(outDeck);
            await this._core.setVolumeDeck(outDeck, 1);
            this._core.switchDecks();
        }
    }

    async instantSwitch(): Promise<void> {
        this._cancelActive();
        this._cancelled = true;
        const outDeck = this._core.activeDeck;
        const inDeck = this._core.inactiveDeck;
        await this._core.pauseDeck(outDeck);
        await this._core.setVolumeDeck(outDeck, 1);
        await this._core.setVolumeDeck(inDeck, 1);
        await this._core.playDeck(inDeck);
        this._core.switchDecks();
    }

    async quickSkip(): Promise<void> {
        this._cancelled = false;
        await this.crossfade({
            durationMs: 300,
            effect: "linear",
        });
    }

    private _cancelActive() {
        this._cancelled = true;
    }

    private _sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private _getCurveValue(t: number, effect: CrossfadeEffect): number {
        switch (effect) {
            case "equal_power":
                return Math.sqrt(t);
            case "linear":
                return t;
            case "instant":
                return t >= 1 ? 1 : 0;
        }
    }
}
