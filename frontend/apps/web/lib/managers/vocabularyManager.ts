import {
    UserVocabularyResponse,
    UserVocabularyResponseSchema,
    type Vocabulary as VocabularyType,
} from "@rockit/shared";
import { createAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";

function createVocabularyProxy(data: Record<string, string>): VocabularyType {
    return new Proxy(data, {
        get(target, prop: string) {
            return target[prop] ?? prop;
        },
    }) as unknown as VocabularyType;
}

export class VocabularyManager {
    private _vocabularyAtom = createAtom<VocabularyType>(
        createVocabularyProxy({})
    );
    private _langAtom = createAtom<string>("");

    async init() {
        try {
            const data = await this.getVocabulary();
            if (data) {
                this.setVocabulary(data);
            }
        } catch {
            // Vocabulary not available, likely no session
        }
    }

    async getVocabulary() {
        try {
            const data = await apiFetch(
                "/vocabulary/user",
                UserVocabularyResponseSchema
            );
            return data;
        } catch {
            return null;
        }
    }

    setVocabulary(data: UserVocabularyResponse) {
        this._vocabularyAtom.set(createVocabularyProxy(data.vocabulary));
        this._langAtom.set(data.currentLang);
    }

    get vocabularyAtom() {
        return this._vocabularyAtom.getReadonlyAtom();
    }

    get vocabulary() {
        return this._vocabularyAtom.get();
    }

    get langAtom() {
        return this._langAtom.getReadonlyAtom();
    }

    get lang() {
        return this._langAtom.get();
    }
}
