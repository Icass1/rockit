import type { Dispatch, SetStateAction } from "react";
import { openRockItIndexedDB } from "./indexedDB";

async function downloadFile(
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

export async function clearResources({ database }: { database?: IDBDatabase }) {
    if (!database) {
        database = await openRockItIndexedDB();
    }

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

export async function downloadResources({
    resources,
    database,
    setResources,
}: {
    resources: string[];
    database?: IDBDatabase;
    setResources?: Dispatch<SetStateAction<string[]>> | undefined;
}) {
    console.log("Downloading resources:", resources);

    if (resources.length == 0) return;

    if (!database) {
        database = await openRockItIndexedDB();
    }

    downloadFile("/", database, setResources);
    downloadFile("/song-placeholder.png", database, setResources);

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
