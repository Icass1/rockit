import {
    HttpResult,
    VocabularyResponse,
    type Vocabulary as VocabularyType,
} from "@rockit/shared";
import { Http } from "@/lib/http";
import {
    completeVocabulary,
    fallbackVocabulary,
    vocabularyText,
} from "@/lib/i18n/vocabulary";
import { saveVocabularyOffline } from "@/lib/offline/db";
import { createAtom, ReadonlyAtom } from "@/lib/store";

export class VocabularyManager {
    private _vocabularyAtom = createAtom<VocabularyType>(
        vocabularyText(fallbackVocabulary)
    );
    private _responseAtom = createAtom<VocabularyResponse>(fallbackVocabulary);
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
        data = completeVocabulary(data);
        this._vocabularyAtom.set(vocabularyText(data));
        this._langAtom.set(data.currentLang);
        this._responseAtom.set(data);
        saveVocabularyOffline(data).catch(() => {});
    }

    get responseAtom(): ReadonlyAtom<VocabularyResponse> {
        return this._responseAtom.getReadonlyAtom();
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
