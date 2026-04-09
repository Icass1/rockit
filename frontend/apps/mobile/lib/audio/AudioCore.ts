import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer, AudioStatus } from "expo-audio";

export type DeckId = "A" | "B";

interface DeckState {
    player: AudioPlayer | null;
    uri: string | null;
    loaded: boolean;
    subscription: { remove: () => void } | null;
}

type StatusCallback = (deckId: DeckId, status: AudioStatus) => void;

export class AudioCore {
    private _decks: Record<DeckId, DeckState> = {
        A: { player: null, uri: null, loaded: false, subscription: null },
        B: { player: null, uri: null, loaded: false, subscription: null },
    };

    private _activeDeck: DeckId = "A";
    private _statusCallback: StatusCallback | null = null;

    constructor() {
        setAudioModeAsync({
            allowsRecording: false,
            shouldPlayInBackground: true,
            interruptionMode: "doNotMix",
            playsInSilentMode: true,
            interruptionModeAndroid: "doNotMix",
            shouldRouteThroughEarpiece: false,
        });
    }

    setStatusCallback(cb: StatusCallback) {
        this._statusCallback = cb;
    }

    get activeDeck(): DeckId {
        return this._activeDeck;
    }

    get inactiveDeck(): DeckId {
        return this._activeDeck === "A" ? "B" : "A";
    }

    async loadIntoDeck(deckId: DeckId, uri: string): Promise<void> {
        const deck = this._decks[deckId];

        if (deck.uri === uri && deck.loaded && deck.player) {
            return;
        }

        if (deck.player) {
            deck.subscription?.remove();
            deck.player.remove();
            this._decks[deckId] = {
                player: null,
                uri: null,
                loaded: false,
                subscription: null,
            };
        }

        const player = createAudioPlayer(uri, { updateInterval: 0.25 });
        player.shouldCorrectPitch = true;

        const subscription = player.addListener(
            "playbackStatusUpdate",
            (status: AudioStatus) => {
                this._statusCallback?.(deckId, status);
            }
        );

        this._decks[deckId] = {
            player,
            uri,
            loaded: true,
            subscription,
        };
    }

    async playDeck(deckId: DeckId): Promise<void> {
        const { player } = this._decks[deckId];
        if (!player) return;
        player.play();
    }

    async pauseDeck(deckId: DeckId): Promise<void> {
        const { player } = this._decks[deckId];
        if (!player) return;
        player.pause();
    }

    async seekDeck(deckId: DeckId, seconds: number): Promise<void> {
        const { player } = this._decks[deckId];
        if (!player) return;
        player.seekTo(seconds);
    }

    async setVolumeDeck(deckId: DeckId, volume: number): Promise<void> {
        const { player } = this._decks[deckId];
        if (!player) return;
        player.volume = Math.max(0, Math.min(1, volume));
    }

    async unloadDeck(deckId: DeckId): Promise<void> {
        const deck = this._decks[deckId];
        if (deck.player) {
            deck.player.pause();
            deck.subscription?.remove();
            deck.player.remove();
        }
        this._decks[deckId] = {
            player: null,
            uri: null,
            loaded: false,
            subscription: null,
        };
    }

    switchDecks(): DeckId {
        this._activeDeck = this.inactiveDeck;
        return this._activeDeck;
    }

    getActiveDeckUri(): string | null {
        return this._decks[this._activeDeck].uri;
    }

    isLoaded(deckId: DeckId): boolean {
        return (
            this._decks[deckId].loaded && this._decks[deckId].player !== null
        );
    }

    async unloadAll(): Promise<void> {
        await this.unloadDeck("A");
        await this.unloadDeck("B");
    }
}
