import { Audio, AVPlaybackStatus } from "expo-av";

export type DeckId = "A" | "B";

interface DeckState {
    sound: Audio.Sound | null;
    uri: string | null;
    loaded: boolean;
}

type StatusCallback = (deckId: DeckId, status: AVPlaybackStatus) => void;

export class AudioCore {
    private _decks: Record<DeckId, DeckState> = {
        A: { sound: null, uri: null, loaded: false },
        B: { sound: null, uri: null, loaded: false },
    };

    private _activeDeck: DeckId = "A";
    private _statusCallback: StatusCallback | null = null;

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

        if (deck.uri === uri && deck.loaded && deck.sound) {
            return;
        }

        if (deck.sound) {
            await deck.sound.unloadAsync();
            deck.sound = null;
        }

        const { sound } = await Audio.Sound.createAsync(
            { uri },
            {
                shouldPlay: false,
                progressUpdateIntervalMillis: 500,
                pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
            },
            (status) => this._statusCallback?.(deckId, status)
        );

        deck.sound = sound;
        deck.uri = uri;
        deck.loaded = true;
    }

    async playDeck(deckId: DeckId): Promise<void> {
        const deck = this._decks[deckId];
        if (!deck.sound) return;
        await deck.sound.playAsync();
    }

    async pauseDeck(deckId: DeckId): Promise<void> {
        const deck = this._decks[deckId];
        if (!deck.sound) return;
        await deck.sound.pauseAsync();
    }

    async seekDeck(deckId: DeckId, seconds: number): Promise<void> {
        const deck = this._decks[deckId];
        if (!deck.sound) return;
        await deck.sound.setPositionAsync(seconds * 1000);
    }

    async setVolumeDeck(deckId: DeckId, volume: number): Promise<void> {
        const deck = this._decks[deckId];
        if (!deck.sound) return;
        await deck.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    }

    async unloadDeck(deckId: DeckId): Promise<void> {
        const deck = this._decks[deckId];
        if (deck.sound) {
            await deck.sound.unloadAsync();
        }
        this._decks[deckId] = { sound: null, uri: null, loaded: false };
    }

    switchDecks(): DeckId {
        this._activeDeck = this.inactiveDeck;
        return this._activeDeck;
    }

    getActiveDeckUri(): string | null {
        return this._decks[this._activeDeck].uri;
    }

    isLoaded(deckId: DeckId): boolean {
        return this._decks[deckId].loaded;
    }

    async unloadAll(): Promise<void> {
        await this.unloadDeck("A");
        await this.unloadDeck("B");
    }
}
