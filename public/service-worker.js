let RockItDatabase;

// function fillFilesIndexedDB(filesStore) {
//     console.warn("fillFilesIndexedDB");

//     if (!filesStore.indexNames.contains("url"))
//         filesStore.createIndex("url", "url", { unique: true });
//     if (!filesStore.indexNames.contains("fileContent"))
//         filesStore.createIndex("fileContent", "fileContent", {
//             unique: false,
//         });
//     if (!filesStore.indexNames.contains("contentType"))
//         filesStore.createIndex("contentType", "contentType", {
//             unique: false,
//         });
// }

// function openRockItAppIndexedDB() {
//     const dbOpenRequest = indexedDB.open("RockItApp", 5);

//     dbOpenRequest.onupgradeneeded = function (event) {
//         const db = dbOpenRequest.result;
//         const transaction = event?.target?.transaction;

//         if (!db.objectStoreNames.contains("files")) {
//             const filesStore = db.createObjectStore("files", {
//                 keyPath: "url",
//             });
//             fillFilesIndexedDB(filesStore);
//         } else {
//             fillFilesIndexedDB(transaction.objectStore("files"));
//         }
//     };

//     return new Promise((resolve, reject) => {
//         dbOpenRequest.onsuccess = function () {
//             resolve(dbOpenRequest.result);
//         };

//         dbOpenRequest.onerror = function () {
//             reject(dbOpenRequest.error);
//         };
//     });
// }

function fillImageIndexedDB(imageStore) {
    console.warn("fillImagesIndexedDB");
    if (!imageStore.indexNames.contains("id"))
        imageStore.createIndex("id", "id", { unique: true });
    if (!imageStore.indexNames.contains("blob"))
        imageStore.createIndex("blob", "blob", { unique: false });
}

function fillSongIndexedDB(songsStore) {
    console.warn("fillSongsIndexedDB");
    if (!songsStore.indexNames.contains("id"))
        songsStore.createIndex("id", "id", { unique: true });
    if (!songsStore.indexNames.contains("value"))
        songsStore.createIndex("value", "value", { unique: false });
}

function fillLangIndexedDB(langStore) {
    console.warn("fillLangIndexedDB");
    if (!langStore.indexNames.contains("lang"))
        langStore.createIndex("lang", "lang", { unique: true });
    if (!langStore.indexNames.contains("langData"))
        langStore.createIndex("langData", "langData", {
            unique: false,
        });
}

function fillUserIndexedDB(userStore) {
    console.warn("fillUserIndexedDB");
    if (!userStore.indexNames.contains("id"))
        userStore.createIndex("id", "id", { unique: true });
    if (!userStore.indexNames.contains("value"))
        userStore.createIndex("value", "value", {
            unique: false,
        });
}
function fillApiRequestsIndexedDB(apiStore) {
    console.warn("fillApiRequestsIndexedDB");
    if (!apiStore.indexNames.contains("id"))
        apiStore.createIndex("url", "url", { unique: true });
    if (!apiStore.indexNames.contains("value"))
        apiStore.createIndex("value", "value", {
            unique: false,
        });
}

function fillFileIndexedDB(fileStore) {
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

function openRockItIndexedDB() {
    const dbOpenRequest = indexedDB.open("RockIt", 14);

    return new Promise((resolve, reject) => {
        dbOpenRequest.onupgradeneeded = function (event) {
            const db = dbOpenRequest.result;
            console.error("dbOpenRequest.onupgradeneeded 1");

            const transaction = event?.target?.transaction;

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
            if (!db.objectStoreNames.contains("images")) {
                const imageStore = db.createObjectStore("images", {
                    keyPath: "id",
                });
                fillImageIndexedDB(imageStore);
            } else {
                fillImageIndexedDB(transaction.objectStore("images"));
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

// Helper functions for API caching
async function cacheApiResponse(url, data) {
    if (!RockItDatabase) {
        RockItDatabase = await openRockItIndexedDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = RockItDatabase.transaction("api", "readwrite");
        const store = transaction.objectStore("api");

        const apiEntry = {
            url: url.pathname + url.search,
            data: data,
            timestamp: Date.now(),
        };

        const request = store.put(apiEntry);

        request.onsuccess = () => resolve();
        request.onerror = (e) => {
            console.error("Failed to cache API response:", e);
            reject(e);
        };
    });
}

async function getCachedApiResponse(url) {
    if (!RockItDatabase) {
        RockItDatabase = await openRockItIndexedDB();
    }

    return new Promise((resolve) => {
        const transaction = RockItDatabase.transaction("api");
        const store = transaction.objectStore("api");
        const request = store.get(url.pathname + url.search);

        request.onsuccess = (e) => {
            const result = e.target.result;
            if (!result) {
                resolve(null);
                return;
            }

            // You might want to add cache expiration logic here
            // if (Date.now() - result.timestamp > CACHE_TTL) {
            //     resolve(null);
            //     return;
            // }

            resolve(
                new Response(JSON.stringify(result.data), {
                    headers: { "Content-Type": "application/json" },
                })
            );
        };

        request.onerror = () => resolve(null);
    });
}

const fromNetwork = async (request, timeout) => {
    const url = new URL(request.url);

    if (
        url.pathname.startsWith("/api") &&
        !url.pathname.startsWith("/api/error/new") &&
        !url.pathname.startsWith("/api/song/audio") &&
        !url.pathname.startsWith("/api/user/set-lang")
    ) {
        console.log("API request:", url.pathname + url.search);

        try {
            // First try to get from network
            const networkResponse = await fetch(request);

            if (networkResponse.ok) {
                // Clone the response to store it (responses can only be read once)
                const responseClone = networkResponse.clone();

                // Cache the API response in IndexedDB
                await cacheApiResponse(url, await responseClone.json());
            }

            return networkResponse;
        } catch (networkError) {
            console.log(
                "Network failed, trying cache...",
                url.pathname + url.search,
                networkError
            );

            // If network fails, try to get from cache
            const cachedResponse = await getCachedApiResponse(url);
            if (cachedResponse) {
                return cachedResponse;
            }

            throw networkError; // No cache available
        }
    }

    if (url.pathname.startsWith("/api/image/")) {
        const imageId = url.pathname.replace("/api/image/", "").split("_")[0];

        // console.debug("Getting image from indexeddb", imageId);

        return new Promise(async (resolve, reject) => {
            // Fix 1: Correct RockItDatabase existence check
            if (!RockItDatabase) {
                // console.debug("Opening RockIt RockItDatabase");
                try {
                    RockItDatabase = await openRockItIndexedDB();
                } catch (error) {
                    console.error("Failed to open RockItDatabase:", error);
                    return reject(error);
                }
            }

            let getRequest;
            try {
                getRequest = RockItDatabase.transaction("images")
                    .objectStore("images")
                    .get(imageId);
            } catch (error) {
                console.log("RockItDatabase error, reopening...", error);
                try {
                    RockItDatabase = await openRockItIndexedDB();
                    getRequest = RockItDatabase.transaction("images")
                        .objectStore("images")
                        .get(imageId);
                } catch (retryError) {
                    console.error(
                        "Failed to reopen RockItDatabase:",
                        retryError
                    );
                    return fetch(request).then(resolve).catch(reject);
                }
            }
            // console.debug("getRequest", getRequest);

            getRequest.onsuccess = function (event) {
                if (!event.target.result) {
                    return fetch(request).then(resolve).catch(reject);
                }
                resolve(
                    new Response(event.target.result.blob, {
                        headers: { "Content-Type": "image/png" },
                    })
                );
            };

            getRequest.onerror = () => {
                fetch(request).then(resolve).catch(reject);
            };
        });
    }
    return fetch(request);
};

const fromCache = (request) => {
    const url = new URL(request.url);

    console.log("fromCache", url);

    return new Promise(async (resolve) => {
        // Fix 2: Correct RockItDatabase existence check
        if (!RockItDatabase) {
            // console.debug("Opening RockItApp RockItDatabase");
            try {
                RockItDatabase = await openRockItIndexedDB();
            } catch (error) {
                console.error("Failed to open RockItDatabase:", error);
                return resolve(
                    new Response("You are offline", { status: 404 })
                );
            }
        }

        let getRequest;
        try {
            getRequest = RockItDatabase.transaction("file")
                .objectStore("file")
                .get(url.pathname);
        } catch (error) {
            console.log("RockItDatabase error, reopening...", error);
            try {
                RockItDatabase = await openRockItIndexedDB();
                getRequest = RockItDatabase.transaction("file")
                    .objectStore("file")
                    .get(url.pathname);
            } catch (retryError) {
                return resolve(
                    new Response("You are offline", { status: 404 })
                );
            }
        }

        getRequest.onsuccess = (event) => {
            resolve(
                event.target.result
                    ? new Response(event.target.result.fileContent, {
                          headers: {
                              "Content-Type": event.target.result.contentType,
                          },
                      })
                    : new Response("Not found", { status: 404 })
            );
        };

        getRequest.onerror = () => {
            resolve(new Response("Cache error", { status: 500 }));
        };
    });
};

// general strategy when making a request (eg if online try to fetch it
// from the network with a timeout, if something fails serve from cache)
self.addEventListener("fetch", (evt) => {
    // console.debug(evt, evt.request);

    if (evt.request.url.includes("/download-status/")) return;
    // if (!evt.request.url.includes("rockit.rockhosting.org")) return
    // if (!evt.request.url.includes("localhost")) return

    evt.respondWith(
        fromNetwork(evt.request, 10000).catch(() => fromCache(evt.request))
    );
    // evt.waitUntil(update(evt.request));
});

self.addEventListener("install", (event) => {
    self.skipWaiting(); // Forces the new SW to take control immediately
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        self.clients.claim() // Takes control of all clients immediately
    );
});
