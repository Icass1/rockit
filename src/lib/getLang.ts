import type { Lang } from "@/types/lang";
import { readFileSync } from "fs";

export function getLang(lang: string): Lang {
    const rawLang = readFileSync(`public/lang/${lang}.json`, "utf-8");

    return JSON.parse(rawLang);
}
