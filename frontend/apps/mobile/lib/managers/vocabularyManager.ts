import { createAtom, type ReadonlyAtom, type Vocabulary } from "@rockit/shared";

function createVocabularyProxy(data: Record<string, string>): Vocabulary {
    return new Proxy(data, {
        get(target, prop) {
            if (typeof prop === "symbol") {
                return (target as Record<string | symbol, unknown>)[prop];
            }
            return target[prop] ?? prop;
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
