import type { Dispatch, SetStateAction } from "react";
import { openRockItIndexedDB } from "@/lib/utils/indexedDB";

export async function downloadFile(
    url: string,
    database: IDBDatabase,
    setResources?: Dispatch<SetStateAction<string[]>> | undefined
): Promise<void> {
    if (setResources) setResources((value): string[] => [...value, url]);

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
        setResources((value): string[] =>
            value.filter((value): boolean => value != url)
        );
}

export async function clearResources(): Promise<void> {
    const database = await openRockItIndexedDB();

    return new Promise<void>((resolve, reject): void => {
        const transaction = database?.transaction("file", "readwrite");
        const fileStore = transaction?.objectStore("file");
        const clearRequest = fileStore.clear();

        clearRequest.onsuccess = (): void => {
            resolve();
        };
        clearRequest.onerror = (): void => {
            reject();
        };
    });
}

export async function downloadRsc(
    url: string,
    database: IDBDatabase
): Promise<void> {
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
    }
}

export async function downloadResources({
    setResources,
}: {
    setResources?: Dispatch<SetStateAction<string[]>> | undefined;
}): Promise<void> {
    const database = await openRockItIndexedDB();

    downloadFile("/library", database, setResources);
    downloadFile("/settings", database);
    downloadFile("/stats", database);

    downloadFile("/logo-banner.png", database, setResources);
    downloadFile("/user-placeholder.png", database, setResources);

    downloadRsc("/", database);
    downloadRsc("/library", database);
    downloadRsc("/settings", database);
    downloadRsc("/stats", database);

    const responseStaticTree = await fetch("get-static-tree");
    const staticTree: string[] = await responseStaticTree.json();

    await Promise.all(
        staticTree.map(async (path): Promise<void> => {
            return downloadFile(
                `/_next/static/${path}`,
                database,
                setResources
            );
        })
    );
}
