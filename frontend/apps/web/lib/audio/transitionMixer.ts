import type {
    TransitionDeck,
    TransitionEnergySample,
    WebTransitionSettings,
} from "@/models/types/transitions";

export const DEFAULT_TRANSITIONS: WebTransitionSettings = {
    enabled: false,
    maxSeconds: 3.5,
    preserveAlbum: true,
};

export function transitionDuration(
    samples: TransitionEnergySample[],
    duration: number,
    now: number,
    maximum: number
): number {
    const energy = (points: TransitionEnergySample[]): number =>
        Math.sqrt(
            points.reduce((sum, sample): number => sum + sample.rms ** 2, 0) /
                Math.max(1, points.length)
        );
    const baseline = samples.filter(
        (sample): boolean =>
            sample.time >= duration - 20 && sample.time < duration - 12
    );
    const tail = samples.filter((sample): boolean => sample.time >= now - 4);
    // After a seek or a suspended page we may not have a representative window.
    // Use a short handoff rather than guessing a quiet tail from missing data.
    if (baseline.length < 8 || tail.length < 4) return Math.min(0.8, maximum);
    const reference = energy(baseline);
    if (reference < 0.001) return Math.min(0.8, maximum);
    const ratio = energy(tail) / reference;
    return Math.min(maximum, ratio < 0.35 ? 3.5 : ratio < 0.65 ? 2 : 0.8);
}

/** Persistent native Web Audio graph; never fetches/decodes a whole track. */
export class TransitionMixer {
    private _context?: AudioContext;
    private _master?: GainNode;
    private _decks = new WeakMap<HTMLAudioElement, TransitionDeck>();
    private _samples = new Float32Array(512);

    get running(): boolean {
        return this._context?.state === "running";
    }

    activate(): void {
        if (
            typeof window === "undefined" ||
            typeof AudioContext === "undefined"
        )
            return;
        try {
            if (!this._context) {
                this._context = new AudioContext();
                this._master = this._context.createGain();
                this._master.gain.value = 0.6;
                this._master.connect(this._context.destination);
            }
            if (this._context.state !== "running") {
                void this._context.resume().catch((error): void => {
                    console.error("Transition audio resume failed", error);
                });
            }
        } catch (error) {
            console.error("Transition audio unavailable", error);
        }
    }

    has(element: HTMLAudioElement): boolean {
        return this._decks.has(element);
    }

    connect(element: HTMLAudioElement, audible: boolean): boolean {
        if (this.has(element)) {
            this.reset(element, audible);
            return true;
        }
        const ctx = this._context;
        if (!ctx || !this._master) return false;
        const source = ctx.createMediaElementSource(element);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const low = ctx.createGain(),
            high = ctx.createGain();
        low.gain.value = high.gain.value = audible ? 1 : 0;
        const filters: BiquadFilterNode[] = [];
        for (const [kind, gain] of [
            ["lowpass", low],
            ["highpass", high],
        ] as const) {
            const first = ctx.createBiquadFilter(),
                second = ctx.createBiquadFilter();
            for (const filter of [first, second]) {
                filter.type = kind;
                filter.frequency.value = 180;
                filter.Q.value = 20 * Math.log10(1 / Math.sqrt(2));
            }
            analyser.connect(first);
            first.connect(second);
            second.connect(gain);
            gain.connect(this._master);
            filters.push(first, second);
        }
        element.volume = 1;
        this._decks.set(element, { source, analyser, low, high, filters });
        return true;
    }

    reset(element: HTMLAudioElement, audible: boolean): void {
        const deck = this._decks.get(element),
            ctx = this._context;
        if (!deck || !ctx) return;
        for (const gain of [deck.low.gain, deck.high.gain]) {
            gain.cancelScheduledValues(0);
            gain.setValueAtTime(audible ? 1 : 0, ctx.currentTime);
        }
    }

    volume(value: number): void {
        if (this._master) this._master.gain.value = 0.6 * value;
    }

    rms(element: HTMLAudioElement): number {
        const analyser = this._decks.get(element)?.analyser;
        if (!analyser || !this.running) return 0;
        analyser.getFloatTimeDomainData(this._samples);
        let sum = 0;
        for (const sample of this._samples) sum += sample * sample;
        return Math.sqrt(sum / this._samples.length);
    }

    blend(
        outgoing: HTMLAudioElement,
        incoming: HTMLAudioElement,
        seconds: number
    ): boolean {
        const ctx = this._context,
            a = this._decks.get(outgoing),
            b = this._decks.get(incoming);
        if (
            !ctx ||
            !this.running ||
            !a ||
            !b ||
            !Number.isFinite(seconds) ||
            seconds < 0.05
        )
            return false;
        const curves = [
            new Float32Array(257),
            new Float32Array(257),
            new Float32Array(257),
            new Float32Array(257),
        ];
        for (let i = 0; i < 257; i++) {
            const u = i / 256;
            const smooth = u * u * (3 - 2 * u);
            const lowU = Math.max(0, (u - 0.35) / 0.65);
            const low = lowU * lowU * (3 - 2 * lowU);
            curves[0][i] = Math.cos((smooth * Math.PI) / 2) ** 1.4;
            curves[1][i] = Math.sin((smooth * Math.PI) / 2) ** 1.4;
            curves[2][i] = 1 - low;
            curves[3][i] = low;
        }
        for (const [i, param] of [
            a.high.gain,
            b.high.gain,
            a.low.gain,
            b.low.gain,
        ].entries()) {
            param.cancelScheduledValues(0);
            param.setValueCurveAtTime(curves[i], ctx.currentTime, seconds);
        }
        return true;
    }
}
