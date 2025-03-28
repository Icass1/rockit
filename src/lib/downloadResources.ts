import * as cheerio from "cheerio";
import type { Dispatch, SetStateAction } from "react";

function extractImports(jsFileContent: string) {
    const importRegex =
        /import\s+["']([^"']+)["'];|import(?:["'\s]*[\w*{}\s,]*from\s*)?["']([^"']+)["']/g;
    const resources = [];
    let match;

    while ((match = importRegex.exec(jsFileContent)) !== null) {
        const resourcePath = match[1] || match[2]; // Match either type of import path
        if (resourcePath) {
            resources.push(resourcePath);
        }
    }

    return resources;
}

function fillFilesIndexedDB(filesStore: IDBObjectStore) {
    console.warn("fillFilesIndexedDB");

    if (!filesStore.indexNames.contains("url"))
        filesStore.createIndex("url", "url", { unique: true });
    if (!filesStore.indexNames.contains("fileContent"))
        filesStore.createIndex("fileContent", "fileContent", {
            unique: false,
        });
    if (!filesStore.indexNames.contains("contentType"))
        filesStore.createIndex("contentType", "contentType", {
            unique: false,
        });
}

function openRockItAppIndexedDB(): Promise<IDBDatabase> {
    const dbOpenRequest = indexedDB.open("RockItApp", 5);

    dbOpenRequest.onupgradeneeded = function (event) {
        const db = dbOpenRequest.result;

        const transaction = (event?.target as IDBOpenDBRequest)
            ?.transaction as IDBTransaction;

        if (!db.objectStoreNames.contains("files")) {
            const filesStore = db.createObjectStore("files", {
                keyPath: "url",
            });
            fillFilesIndexedDB(filesStore);
        } else {
            fillFilesIndexedDB(transaction.objectStore("files"));
        }
    };

    return new Promise((resolve, reject) => {
        dbOpenRequest.onsuccess = function () {
            resolve(dbOpenRequest.result);
        };

        dbOpenRequest.onerror = function () {
            reject(dbOpenRequest.error);
        };
    });
}

function fetchResource(url: string, database: IDBDatabase): Promise<string[]> {
    return new Promise((resolve, _) => {
        // If a file is some thing like this, ./index.D5cSYS0A.js in an import statement, the route to that file is /_astro/index.D5cSYS0A.js
        if (/\.[A-Za-z0-9\-_]{8}\./.test(url)) {
            url = url.replace("./", "/_astro/");
        }

        fetch(url).then((response) => {
            if (response.ok) {
                response.blob().then((fileContent) => {
                    if (
                        response.headers
                            .get("content-type")
                            ?.includes("text") ||
                        response.headers
                            .get("content-type")
                            ?.includes("javascript")
                    ) {
                        let resources: string[] = [];

                        fileContent.text().then((text) => {
                            const loadedCheerio = cheerio.load(text);
                            loadedCheerio("script[src]").each((_, el) => {
                                const src = loadedCheerio(el).attr("src");
                                if (src) {
                                    resources.push(src);
                                }
                            });

                            loadedCheerio("link").each((_, el) => {
                                const src = loadedCheerio(el).attr("href");
                                if (src) {
                                    resources.push(src);
                                }
                            });
                            loadedCheerio("astro-island").each((_, el) => {
                                let src =
                                    loadedCheerio(el).attr("component-url");
                                if (src) {
                                    resources.push(src);
                                }
                                src = loadedCheerio(el).attr("renderer-url");
                                if (src) {
                                    resources.push(src);
                                }
                            });
                            loadedCheerio("img[src]").each((_, el) => {
                                const src = loadedCheerio(el).attr("src");
                                if (src) {
                                    resources.push(src);
                                }
                            });
                            resources.push(...extractImports(text));

                            resolve(resources);
                        });
                    } else {
                        resolve([]);
                    }

                    const transaction = database?.transaction(
                        "files",
                        "readwrite"
                    );
                    const filesStore = transaction?.objectStore("files");
                    filesStore?.put({
                        url: url,
                        fileContent,
                        contentType: response.headers.get("content-type"),
                    });
                });
            } else {
                resolve([]);
            }
        });
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
        database = await openRockItAppIndexedDB();
    }

    const tempResources: string[][] = await Promise.all(
        resources.map(async (url) => {
            if (setResources) setResources((value) => [...value, url]);

            const resources = await fetchResource(url, database);

            if (setResources)
                setResources((value) => value.filter((value) => value != url));

            return resources;
        })
    );
    const newResources = [...new Set(tempResources.flat(1))];
    downloadResources({ resources: newResources, database, setResources });
}
