import { UserVocabularyResponse, UserVocabularyResponseSchema } from "@/dto";
import { Vocabulary } from "@/types/vocabulary";
import { createAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";

function createVocabularyProxy(data: Record<string, string>): Vocabulary {
    return new Proxy(data, {
        get(target, prop: string) {
            return target[prop] ?? prop;
        },
    }) as unknown as Vocabulary;
}

export class VocabularyManager {
    private _vocabularyAtom = createAtom<Vocabulary>(createVocabularyProxy({}));
    private _langAtom = createAtom<string>("");

    async getVocabulary() {
        const data = await apiFetch(
            "/vocabulary/user",
            UserVocabularyResponseSchema
        );
        return data;
    }

    async setVocabulary(data: UserVocabularyResponse) {
        this._vocabularyAtom.set(createVocabularyProxy(data.vocabulary));
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
