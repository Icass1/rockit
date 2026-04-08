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
        const data = await this.getVocabulary();
        if (data.isOk()) {
            this.setVocabulary(data.result);
            return;
        }
        console.error(
            "Error in VocabularyManager.init: " +
                data.message +
                "   " +
                data.detail
        );
    }

    async getVocabulary() {
        return await apiFetch("/vocabulary/user", UserVocabularyResponseSchema);
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
