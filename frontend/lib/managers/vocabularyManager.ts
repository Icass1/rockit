import { Vocabulary } from "@/types/vocabulary";
import { createAtom } from "@/lib/store";

export class VocabularyManager {
    private _vocabularyAtom = createAtom<Vocabulary>({} as Vocabulary);
    private _langAtom = createAtom<string>("");

    constructor() {}

    get vocabularyAtom() {
        return this._vocabularyAtom;
    }

    get vocabulary() {
        return this._vocabularyAtom.get();
    }

    get langAtom() {
        return this._langAtom;
    }

    get lang() {
        return this._langAtom.get();
    }
}
