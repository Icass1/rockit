import type { Lang } from "@/types/lang";
import { atom } from "nanostores";

export const langData = atom<Lang | undefined>(undefined);
export const lang = atom<string | undefined>(undefined);

fetch("/api/lang")
    .then((response) => response.json())
    .then((data) => {
        langData.set(data.langFile);
        lang.set(data.lang);
    })
    .catch(() =>
        fetch("/api/lang?lang=en")
            .then((response) => response.json())
            .then((data) => {
                langData.set(data.langFile);
                lang.set(data.lang);
            })
    );

lang.subscribe(async (value) => {
    if (!value) return;

    fetch("/api/user/set-lang", {
        body: JSON.stringify({ lang: value }),
        method: "POST",
    });
});
