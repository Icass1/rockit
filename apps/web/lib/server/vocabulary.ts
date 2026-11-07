import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { VocabularyResponse } from "@/dto";
import { ServerHttp } from "@/lib/api/server";
import {
    completeVocabulary,
    fallbackVocabulary,
    preferredLanguage,
} from "@/lib/i18n/vocabulary";

export const getRequestVocabulary = cache(
    async (): Promise<VocabularyResponse> => {
        const cookieStore = await cookies();
        if (cookieStore.has("session_id")) {
            const response = await ServerHttp.getUserVocabulary();
            if (response.isOk()) return completeVocabulary(response.result);
        }
        const lang = preferredLanguage(
            cookieStore.get("rockit-language")?.value ??
                (await headers()).get("accept-language")
        );
        if (lang === "en") return fallbackVocabulary;
        const response = await ServerHttp.getVocabularyByCode(lang);
        return response.isOk()
            ? completeVocabulary(response.result)
            : fallbackVocabulary;
    }
);
