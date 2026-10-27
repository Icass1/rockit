import {
    HttpResult,
    VocabularyResponse,
    type Vocabulary as VocabularyType,
} from "@rockit/shared";
import friendsVocabulary from "@/lib/generated/friendsVocabulary.json";
import { Http } from "@/lib/http";
import { saveVocabularyOffline } from "@/lib/offline/db";
import { createAtom, ReadonlyAtom } from "@/lib/store";

function createVocabularyProxy(
    data: Record<string, string>,
    lang = "en"
): VocabularyType {
    const defaults: Record<string, Record<string, string>> = Object.fromEntries(
        Object.keys(friendsVocabulary).map((code) => [
            code,
            {
                ...friendsVocabulary[code as keyof typeof friendsVocabulary],
            },
        ])
    );
    const language = lang.toLowerCase().split(/[-_]/)[0];
    const fallback = defaults[language] ?? defaults.en;
    return new Proxy(data, {
        get(target, prop) {
            if (typeof prop === "symbol") {
                return (target as Record<string | symbol, unknown>)[prop];
            }
            return target[prop] || fallback?.[prop] || prop;
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
        this._vocabularyAtom.set(
            createVocabularyProxy(data.vocabulary, data.currentLang)
        );
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
