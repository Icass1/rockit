import { Vocabulary } from "@/types/vocabulary";
import { createAtom } from "@/lib/store";

export class VocabularyManager {
    private _vocabularyAtom = createAtom<Vocabulary>({});

    constructor() {}

    get vocabularyAtom() {
        return this._vocabularyAtom;
    }
    get vocabulary() {
        return this._vocabularyAtom.get();
    }
}
