import type { Lang } from "@/types/lang";
import { atom } from "nanostores";
import { database, updateUserIndexedDB } from "./audio";

export const langData = atom<Lang | undefined>(undefined);
export const lang = atom<string | undefined>(undefined);

fetch("/api/lang")
    .then((response) => response.json())
    .then((data) => {
        langData.set(data.langFile);
        lang.set(data.lang);

        if (!database) return;

        updateUserIndexedDB();

        const db = database;
        const langTransaction = db.transaction("lang", "readwrite");
        const langStore = langTransaction.objectStore("lang");

        const langValue = {
            lang: data.lang,
            langData: data.langFile,
        };

        langStore.put(langValue);
    })
    .catch(() =>
        fetch("/api/lang?lang=en")
            .then((response) => response.json())
            .then((data) => {
                langData.set(data.langFile);
                lang.set(data.lang);
                if (!database) return;

                updateUserIndexedDB();

                const db = database;
                const langTransaction = db.transaction("lang", "readwrite");
                const langStore = langTransaction.objectStore("lang");

                const langValue = {
                    lang: data.lang,
                    langData: data.langFile,
                };

                langStore.put(langValue);
            })
    )
    .catch(() => {
        if (!database) {
            console.error("Unable to get lang 1");
            return;
        }

        const db = database;

        const userTransaction = db.transaction("user", "readonly");
        const userStore = userTransaction.objectStore("user");
        const userQuery = userStore.get("user");

        userQuery.onsuccess = function () {
            console.log();
            const langTransaction = db.transaction("lang", "readonly");
            const langStore = langTransaction.objectStore("lang");
            const langQuery = langStore.get(userQuery.result.lang);
            langQuery.onsuccess = function () {
                langData.set(langQuery.result.langData);
                lang.set(langQuery.result.lang);
            };
            langQuery.onerror = function () {
                console.error("Unable to get lang 2");
            };
        };
        userQuery.onerror = function () {
            console.error("Unable to get lang 3");
        };
    });

lang.subscribe(async (value) => {
    if (!value) return;

    fetch("/api/user/set-lang", {
        body: JSON.stringify({ lang: value }),
        method: "POST",
    });
});
