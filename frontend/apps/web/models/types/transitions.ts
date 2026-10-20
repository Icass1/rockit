export interface WebTransitionSettings {
    enabled: boolean;
    maxSeconds: number;
    preserveAlbum: boolean;
}

export interface TransitionEnergySample {
    time: number;
    rms: number;
}

export interface TransitionDeck {
    source: MediaElementAudioSourceNode;
    analyser: AnalyserNode;
    low: GainNode;
    high: GainNode;
    filters: BiquadFilterNode[];
}
