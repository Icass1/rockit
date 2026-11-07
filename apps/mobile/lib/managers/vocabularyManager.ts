import {
    createAtom,
    vocabularyText,
    type ReadonlyAtom,
    type Vocabulary,
} from "@rockit/shared";

/** Vocabulary defaults are generated from Vocabulary.xlsx, shared by every client. */
export class VocabularyManager {
    private _vocabularyAtom = createAtom<Vocabulary>(
        vocabularyText({ currentLang: "en", vocabulary: {} })
    );

    setVocabulary(data: Record<string, string>): void {
        this._vocabularyAtom.set(
            vocabularyText({ currentLang: "en", vocabulary: data })
        );
    }

    get vocabulary(): Vocabulary {
        return this._vocabularyAtom.get();
    }
    get vocabularyAtom(): ReadonlyAtom<Vocabulary> {
        return this._vocabularyAtom.getReadonlyAtom();
    }
}

export const vocabularyManager = new VocabularyManager();
