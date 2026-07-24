import {
    HttpResult,
    VocabularyResponse,
    type Vocabulary as VocabularyType,
} from "@rockit/shared";
import { Http } from "@/lib/http";
import { createAtom, ReadonlyAtom } from "@/lib/store";
import { saveVocabularyOffline } from "@/lib/offline/db";

function createVocabularyProxy(data: Record<string, string>): VocabularyType {
    return new Proxy(data, {
        get(target, prop) {
            if (typeof prop === "symbol") {
                return (target as Record<string | symbol, unknown>)[prop];
            }
            return target[prop] ?? prop;
        },
    }) as unknown as VocabularyType;
}

export class VocabularyManager {
    private _vocabularyAtom = createAtom<VocabularyType>(
        createVocabularyProxy({})
    );
    private _langAtom = createAtom<string>("");

    async init(): Promise<void> {
        const data = await this.getVocabularyAsync();
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

    async getVocabularyAsync(
        lang?: string
    ): Promise<HttpResult<VocabularyResponse>> {
        if (lang) return await Http.getVocabularyByCode(lang);
        else return await Http.getUserVocabulary();
    }

    setVocabulary(data: VocabularyResponse): void {
        this._vocabularyAtom.set(createVocabularyProxy(data.vocabulary));
        this._langAtom.set(data.currentLang);
        saveVocabularyOffline(data).catch(() => {});
    }

    get vocabularyAtom(): ReadonlyAtom<VocabularyType> {
        return this._vocabularyAtom.getReadonlyAtom();
    }

    get vocabulary(): VocabularyType {
        return this._vocabularyAtom.get();
    }

    get langAtom(): ReadonlyAtom<string> {
        return this._langAtom.getReadonlyAtom();
    }

    get lang(): string {
        return this._langAtom.get();
    }
}
