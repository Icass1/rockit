function fillImageIndexedDB(imageStore: IDBObjectStore) {
    console.warn("fillImagesIndexedDB");
    if (!imageStore.indexNames.contains("id"))
        imageStore.createIndex("id", "id", { unique: true });
    if (!imageStore.indexNames.contains("blob"))
        imageStore.createIndex("blob", "blob", { unique: false });
}

function fillSongIndexedDB(songsStore: IDBObjectStore) {
    console.warn("fillSongsIndexedDB");
    if (!songsStore.indexNames.contains("id"))
        songsStore.createIndex("id", "id", { unique: true });
    if (!songsStore.indexNames.contains("value"))
        songsStore.createIndex("value", "value", { unique: false });
}

function fillLangIndexedDB(langStore: IDBObjectStore) {
    console.warn("fillLangIndexedDB");
    if (!langStore.indexNames.contains("lang"))
        langStore.createIndex("lang", "lang", { unique: true });
    if (!langStore.indexNames.contains("langData"))
        langStore.createIndex("langData", "langData", {
            unique: false,
        });
}

function fillUserIndexedDB(userStore: IDBObjectStore) {
    console.warn("fillUserIndexedDB");
    if (!userStore.indexNames.contains("id"))
        userStore.createIndex("id", "id", { unique: true });
    if (!userStore.indexNames.contains("value"))
        userStore.createIndex("value", "value", {
            unique: false,
        });
}
function fillApiRequestsIndexedDB(apiStore: IDBObjectStore) {
    console.warn("fillApiRequestsIndexedDB");
    if (!apiStore.indexNames.contains("id"))
        apiStore.createIndex("url", "url", { unique: true });
    if (!apiStore.indexNames.contains("value"))
        apiStore.createIndex("value", "value", {
            unique: false,
        });
}

function fillFileIndexedDB(fileStore: IDBObjectStore) {
    console.warn("fillFileIndexedDB");
    if (!fileStore.indexNames.contains("url"))
        fileStore.createIndex("url", "url", { unique: true });
    if (!fileStore.indexNames.contains("fileContent"))
        fileStore.createIndex("fileContent", "fileContent", {
            unique: false,
        });
    if (!fileStore.indexNames.contains("contentType"))
        fileStore.createIndex("contentType", "contentType", {
            unique: false,
        });
}

export function openRockItIndexedDB(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
        return new Promise(() => undefined);
    }

    const dbOpenRequest = indexedDB.open("RockIt", 14);

    return new Promise((resolve, reject) => {
        dbOpenRequest.onupgradeneeded = function (event) {
            const db = dbOpenRequest.result;
            console.error("dbOpenRequest.onupgradeneeded 1");

            const transaction = (event?.target as IDBOpenDBRequest)
                ?.transaction;

            if (!transaction) {
                console.error("Transaction is not defined");
                reject("Transaction is not defined");
                return;
            }

            ////////////////
            // songsStore //
            ////////////////
            if (!db.objectStoreNames.contains("songs")) {
                const songsStore = db.createObjectStore("songs", {
                    keyPath: "id",
                });
                fillSongIndexedDB(songsStore);
            } else {
                fillSongIndexedDB(transaction.objectStore("songs"));
            }

            ////////////////
            // imageStore //
            ////////////////
            if (!db.objectStoreNames.contains("image")) {
                const imageStore = db.createObjectStore("image", {
                    keyPath: "id",
                });
                fillImageIndexedDB(imageStore);
            } else {
                fillImageIndexedDB(transaction.objectStore("image"));
            }

            ///////////////
            // userStore //
            ///////////////
            if (!db.objectStoreNames.contains("user")) {
                const userStore = db.createObjectStore("user", {
                    keyPath: "id",
                });
                fillUserIndexedDB(userStore);
            } else {
                fillUserIndexedDB(transaction.objectStore("user"));
            }

            ///////////////
            // apiStore //
            ///////////////
            if (!db.objectStoreNames.contains("api")) {
                const apiStore = db.createObjectStore("api", {
                    keyPath: "url",
                });
                fillApiRequestsIndexedDB(apiStore);
            } else {
                fillApiRequestsIndexedDB(transaction.objectStore("api"));
            }

            ///////////////
            // fileStore //
            ///////////////
            if (!db.objectStoreNames.contains("file")) {
                const apiStore = db.createObjectStore("file", {
                    keyPath: "url",
                });
                fillFileIndexedDB(apiStore);
            } else {
                fillFileIndexedDB(transaction.objectStore("file"));
            }

            ///////////////
            // langStore //
            ///////////////
            if (!db.objectStoreNames.contains("lang")) {
                const langStore = db.createObjectStore("lang", {
                    keyPath: "lang",
                });
                fillLangIndexedDB(langStore);
            } else {
                fillLangIndexedDB(transaction.objectStore("lang"));
            }
            // No manual transaction.commit() needed
            transaction.oncomplete = () => {
                console.log("Upgrade transaction completed.");
            };
        };

        dbOpenRequest.onsuccess = function () {
            resolve(dbOpenRequest.result);
        };
        dbOpenRequest.onerror = function () {
            reject(dbOpenRequest.error);
        };
    });
}
