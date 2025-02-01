import type { Lang } from "@/types/lang";
import { readFileSync } from "fs";

export function getLang(lang: string): Lang {
    const rawLang = readFileSync(`src/lang/${lang}.json`, "utf-8");

    return JSON.parse(rawLang);
}
