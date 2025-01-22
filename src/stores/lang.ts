import type { Lang } from "@/types/lang";
import { atom } from "nanostores";

const userLang = (await (await fetch("/api/user?q=lang")).json())
    .lang as string;

const langJson = (await (await fetch(`/lang/${userLang}.json`)).json()) as Lang;

export const langData = atom<Lang>(langJson);
export const lang = atom<string>(userLang);

lang.subscribe(async (value) => {
    console.log(value);

    const langJson = (await (
        await fetch(`/lang/${value}.json`)
    ).json()) as Lang;

    fetch("/api/user/set-lang", {
        body: JSON.stringify({ lang: value }),
        method: "POST",
    });

    langData.set(langJson);
});
