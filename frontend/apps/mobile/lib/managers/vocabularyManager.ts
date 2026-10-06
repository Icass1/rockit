import { createAtom, type ReadonlyAtom, type Vocabulary } from "@rockit/shared";

// Keep new player controls readable until the server imports the new vocabulary.
const PLAYER_VOCABULARY: Record<string, string> = {
    PLAYER_ENTER_FULLSCREEN: "Enter fullscreen",
    PLAYER_EXIT_FULLSCREEN: "Exit fullscreen",
    PLAYER_SHOW_CONTROLS: "Show video controls",
    PLAYER_SEEK: "Seek playback position",
    PLAYER_REWIND_TEN_SECONDS: "Rewind 10 seconds",
    PLAYER_FORWARD_TEN_SECONDS: "Forward 10 seconds",
    PLAYER_CLOSE_BOOKMARKS: "Close bookmarks",
    PLAYER_FULLSCREEN_UNAVAILABLE:
        "Fullscreen landscape video is unavailable on this device",
};

function createVocabularyProxy(data: Record<string, string>): Vocabulary {
    return new Proxy(data, {
        get(target, prop) {
            if (typeof prop === "symbol") {
                return (target as Record<string | symbol, unknown>)[prop];
            }
            return target[prop] ?? PLAYER_VOCABULARY[prop] ?? prop;
        },
    }) as unknown as Vocabulary;
}

/**
 * Minimal vocabulary manager so the shared base managers can read localized
 * strings (e.g. error toasts). The VocabularyProvider feeds it the loaded
 * vocabulary via `setVocabulary`; until then, keys fall back to themselves.
 */
export class VocabularyManager {
    private _vocabularyAtom = createAtom<Vocabulary>(createVocabularyProxy({}));

    setVocabulary(data: Record<string, string>): void {
        this._vocabularyAtom.set(createVocabularyProxy(data));
    }

    get vocabulary(): Vocabulary {
        return this._vocabularyAtom.get();
    }

    get vocabularyAtom(): ReadonlyAtom<Vocabulary> {
        return this._vocabularyAtom.getReadonlyAtom();
    }
}
