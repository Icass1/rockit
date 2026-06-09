export class AudioEngine {
    private static _instance: AudioEngine;
    private _ctx: AudioContext | null = null;
    private _masterGain: GainNode | null = null;
    private _keepaliveOsc: OscillatorNode | null = null;
    private _keepaliveGain: GainNode | null = null;
    private _initialized = false;

    private constructor() {}

    static getInstance(): AudioEngine {
        if (!AudioEngine._instance) {
            AudioEngine._instance = new AudioEngine();
        }
        return AudioEngine._instance;
    }

    get context(): AudioContext | null {
        return this._ctx;
    }

    get masterGain(): GainNode | null {
        return this._masterGain;
    }

    private _createContext(): void {
        if (this._ctx) return;
        this._ctx = new AudioContext();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = 1;
        this._masterGain.connect(this._ctx.destination);

        this._ctx.addEventListener("statechange", (): void => {
            if (this._ctx!.state === "suspended") {
                this._ctx!.resume().catch((): void => {});
            }
        });

        this._initialized = true;
    }

    ensureContext(): AudioContext {
        if (!this._ctx) this._createContext();
        return this._ctx!;
    }

    async ensureResumed(): Promise<void> {
        const ctx = this.ensureContext();
        if (ctx.state === "suspended") {
            await ctx.resume();
        }
    }

    createGainNode(): GainNode {
        const ctx = this.ensureContext();
        return ctx.createGain();
    }

    async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
        const ctx = this.ensureContext();
        return ctx.decodeAudioData(arrayBuffer);
    }

    startKeepalive(): void {
        if (this._keepaliveOsc) return;
        if (typeof window === "undefined") return;

        try {
            const ctx = this.ensureContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.frequency.value = 1;
            osc.type = "sine";
            gain.gain.value = 0.001;

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            this._keepaliveOsc = osc;
            this._keepaliveGain = gain;
        } catch {
            /* keepalive not available */
        }
    }

    stopKeepalive(): void {
        try {
            this._keepaliveOsc?.stop();
            this._keepaliveOsc?.disconnect();
            this._keepaliveGain?.disconnect();
        } catch {
            /* ignore */
        }
        this._keepaliveOsc = null;
        this._keepaliveGain = null;
    }

    createMediaElementSource(element: HTMLMediaElement): MediaElementAudioSourceNode {
        const ctx = this.ensureContext();
        return ctx.createMediaElementSource(element);
    }

    get currentTime(): number {
        return this._ctx?.currentTime ?? 0;
    }

    destroy(): void {
        this.stopKeepalive();
        if (this._ctx) {
            this._ctx.close().catch((): void => {});
            this._ctx = null;
        }
        this._masterGain = null;
        this._initialized = false;
    }
}

export const audioEngine = AudioEngine.getInstance();
