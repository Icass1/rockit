import type { Dispatch, SetStateAction } from "react";
import { openRockItIndexedDB } from "./indexedDB";

export async function downloadFile(
    url: string,
    database: IDBDatabase,
    setResources?: Dispatch<SetStateAction<string[]>> | undefined
) {
    console.log(`Downloading ${url}`);

    if (setResources) setResources((value) => [...value, url]);

    const response = await fetch(url);
    if (response.ok) {
        const fileContent = await response.blob();

        const transaction = database?.transaction("file", "readwrite");
        const fileStore = transaction?.objectStore("file");
        fileStore?.put({
            url: url,
            fileContent,
            contentType: response.headers.get("content-type"),
        });
    } else {
        console.error("Error fetching", url);
    }

    if (setResources)
        setResources((value) => value.filter((value) => value != url));
}

export async function clearResources() {
    const database = await openRockItIndexedDB();

    return new Promise<void>((resolve, reject) => {
        const transaction = database?.transaction("file", "readwrite");
        const fileStore = transaction?.objectStore("file");
        const clearRequest = fileStore.clear();

        clearRequest.onsuccess = () => {
            resolve();
        };
        clearRequest.onerror = () => {
            reject();
        };
    });
}

export async function downloadRsc(url: string, database: IDBDatabase) {
    const responsePreFetch = await fetch(url, {
        headers: { rsc: "1", "next-router-prefetch": "1" },
    });

    if (responsePreFetch.ok) {
        const fileContent = await responsePreFetch.blob();

        const transaction = database?.transaction("rsc", "readwrite");
        const fileStore = transaction?.objectStore("rsc");
        fileStore?.put({
            url: url + "next-router-prefetch",
            fileContent,
            headers: {
                "content-type": responsePreFetch.headers.get("content-type"),
                vary: responsePreFetch.headers.get("vary"),
            },
        });
    } else {
        console.warn("responsePreFetch failed");
    }

    const response = await fetch(url, { headers: { rsc: "1" } });
    if (response.ok) {
        const fileContent = await response.blob();

        const transaction = database?.transaction("rsc", "readwrite");
        const fileStore = transaction?.objectStore("rsc");
        fileStore?.put({
            url: url,
            fileContent,
            headers: {
                "content-type": responsePreFetch.headers.get("content-type"),
                vary: responsePreFetch.headers.get("vary"),
            },
        });
    } else {
        console.warn("response failed");
    }
}

export async function downloadResources({
    setResources,
}: {
    setResources?: Dispatch<SetStateAction<string[]>> | undefined;
}) {
    const database = await openRockItIndexedDB();
    console.log("DAtabase opened");

    downloadFile("/", database, setResources);
    downloadFile("/library", database, setResources);
    downloadFile("/settings", database);
    downloadFile("/stats", database);

    downloadFile("/logo-banner.png", database, setResources);
    downloadFile("/user-placeholder.png", database, setResources);

    downloadRsc("/", database);
    downloadRsc("/library", database);
    downloadRsc("/settings", database);
    downloadRsc("/stats", database);

    const responseStaticTree = await fetch("/api/get-static-tree");
    const staticTree: string[] = await responseStaticTree.json();

    await Promise.all(
        staticTree.map(async (path) => {
            return downloadFile(
                `/_next/static/${path}`,
                database,
                setResources
            );
        })
    );
}
