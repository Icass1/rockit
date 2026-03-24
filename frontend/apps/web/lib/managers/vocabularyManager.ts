import {
    UserVocabularyResponse,
    UserVocabularyResponseSchema,
} from "@/dto";
import { createAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";
import { Vocabulary } from "@/types/vocabulary";

export class VocabularyManager {
    private _vocabularyAtom = createAtom<Vocabulary>({} as Vocabulary);
    private _langAtom = createAtom<string>("");

    async getVocabulary() {
        const data = await apiFetch(
            "/vocabulary/user",
            UserVocabularyResponseSchema
        );
        return data;
    }

    async setVocabulary(data: UserVocabularyResponse) {
        this._vocabularyAtom.set(data.vocabulary as unknown as Vocabulary);
        this._langAtom.set(data.currentLang);
    }

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
