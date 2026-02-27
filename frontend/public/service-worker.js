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
    if (!apiStore.indexNames.contains("url"))
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

function fillRSCIndexedDB(rscStore) {
    console.warn("fillRSCIndexedDB");
    if (!rscStore.indexNames.contains("url"))
        rscStore.createIndex("url", "url", { unique: true });
    if (!rscStore.indexNames.contains("fileContent"))
        rscStore.createIndex("fileContent", "fileContent", {
            unique: false,
        });
    if (!rscStore.indexNames.contains("headers"))
        rscStore.createIndex("headers", "headers", {
            unique: false,
        });
}

export function openRockItIndexedDB() {
    console.log("openRockItIndexedDB");

    if (typeof indexedDB === "undefined") {
        return new Promise(() => undefined);
    }

    const dbOpenRequest = indexedDB.open("RockIt", 16);
    console.log("dbOpenRequest", dbOpenRequest);

    return new Promise((resolve, reject) => {
        dbOpenRequest.onupgradeneeded = function (event) {
            const db = dbOpenRequest.result;
            console.error("dbOpenRequest.onupgradeneeded 1");

            const transaction = event?.target?.transaction;

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
            // rscStore //
            ///////////////
            if (!db.objectStoreNames.contains("rsc")) {
                const rscStore = db.createObjectStore("rsc", {
                    keyPath: "url",
                });
                fillRSCIndexedDB(rscStore);
            } else {
                fillRSCIndexedDB(transaction.objectStore("rsc"));
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
            console.log("dbOpenRequest.onsuccess");
            resolve(dbOpenRequest.result);
        };
        dbOpenRequest.onerror = function () {
            console.log("dbOpenRequest.onerror");
            reject(dbOpenRequest.error);
        };
    });
}

let RockItDatabase;

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

// Helper function to handle the fallback logic
async function tryFetchWithPlaceholder(request, resolve, reject) {
    try {
        // First try network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) return resolve(networkResponse);

        // Then try placeholder if network fails
        if (!RockItDatabase) {
            RockItDatabase = await openRockItIndexedDB();
        }

        const placeholderRequest = RockItDatabase.transaction("images")
            .objectStore("images")
            .get("/song-placeholder.png");

        placeholderRequest.onsuccess = (event) => {
            if (event.target.result) {
                return resolve(
                    new Response(event.target.result.blob, {
                        headers: { "Content-Type": "image/png" },
                    })
                );
            }
            reject(new Error("No image available and placeholder not found"));
        };

        placeholderRequest.onerror = () => {
            reject(new Error("Failed to load placeholder"));
        };
    } catch (finalError) {
        reject(finalError);
    }
}

const fromNetwork = async (request) => {
    const url = new URL(request.url);

    if (
        url.pathname.startsWith("/api") &&
        !url.pathname.startsWith("/api/error/new") &&
        !url.pathname.startsWith("/api/proxy") &&
        !url.pathname.startsWith("/api/song/audio") &&
        !url.pathname.startsWith("/api/image/") &&
        !url.pathname.startsWith("/api/user/set-lang")
    ) {
        // console.log("API request:", url.pathname + url.search);

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
            console.debug(
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
    } else if (
        url.pathname.startsWith("/api/image/") &&
        !url.pathname.startsWith("/api/image/blur/")
    ) {
        const imageId = url.pathname.replace("/api/image/", "").split("_")[0];

        // console.log("/api/image/", imageId);

        return new Promise(async (resolve, reject) => {
            if (!RockItDatabase) {
                try {
                    RockItDatabase = await openRockItIndexedDB();
                } catch (error) {
                    console.error("Failed to open RockItDatabase:", error);
                    return tryFetchWithPlaceholder(request, resolve, reject);
                }
            }

            try {
                // First try to get the requested image
                const getRequest = RockItDatabase.transaction("images")
                    .objectStore("images")
                    .get(imageId);

                getRequest.onsuccess = async (event) => {
                    // console.log("getRequest.onsuccess");
                    if (event.target.result) {
                        // console.log("getRequest.onsuccess 1");

                        return resolve(
                            new Response(event.target.result.blob, {
                                headers: { "Content-Type": "image/png" },
                            })
                        );
                    }

                    // If image not found, try to fetch from network
                    try {
                        // console.log("getRequest.onsuccess 2");

                        const networkResponse = await fetch(request);
                        // console.log("getRequest.onsuccess 3");

                        if (networkResponse.ok) return resolve(networkResponse);
                        throw new Error("Network response not OK");
                    } catch (networkError) {
                        console.log(
                            "Network failed, trying placeholder...",
                            networkError
                        );
                        // console.log("getRequest.onsuccess 4");

                        // If network fails, try to get placeholder
                        const placeholderRequest = RockItDatabase.transaction(
                            "file"
                        )
                            .objectStore("file")
                            .get("/song-placeholder.png");

                        placeholderRequest.onsuccess = (placeholderEvent) => {
                            // console.log("getRequest.onsuccess 5");

                            if (placeholderEvent.target.result) {
                                return resolve(
                                    new Response(
                                        placeholderEvent.target.result
                                            .fileContent,
                                        {
                                            headers: {
                                                "Content-Type": "image/png",
                                            },
                                        }
                                    )
                                );
                            }
                            // If no placeholder available, reject
                            reject(
                                new Error(
                                    "No image available and placeholder not found"
                                )
                            );
                        };

                        placeholderRequest.onerror = () => {
                            reject(new Error("Failed to load placeholder"));
                        };
                    }
                };

                getRequest.onerror = () => {
                    tryFetchWithPlaceholder(request, resolve, reject);
                };
            } catch {
                tryFetchWithPlaceholder(request, resolve, reject);
            }
        });
    }
    return fetch(request);
};

const fromCache = (request) => {
    const url = new URL(request.url);

    console.debug("fromCache", url);

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

        if (url.searchParams.get("_rsc")) {
            console.debug(url.pathname, url.searchParams.get("_rsc"));

            let getRequest;

            if (request.headers.get("next-router-prefetch") == "1") {
                console.debug("next-router-prefetch");
                getRequest = RockItDatabase.transaction("rsc")
                    .objectStore("rsc")
                    .get(url.pathname + "next-router-prefetch");
            } else {
                console.debug("no next-router-prefetch");

                getRequest = RockItDatabase.transaction("rsc")
                    .objectStore("rsc")
                    .get(url.pathname);
            }

            console.debug(getRequest);

            getRequest.onsuccess = (event) => {
                console.debug("getrequest.onsuccess", event.target.result);
                resolve(
                    event.target.result
                        ? new Response(event.target.result.fileContent, {
                              headers: {
                                  "Content-Type":
                                      event.target.result.headers[
                                          "content-type"
                                      ],
                                  vary: event.target.result.headers["vary"],
                              },
                          })
                        : new Response("Not found", { status: 404 })
                );
            };

            getRequest.onerror = () => {
                resolve(new Response("Cache error", { status: 500 }));
            };
        } else {
            let getRequest;
            try {
                getRequest = RockItDatabase.transaction("file")
                    .objectStore("file")
                    .get(url.pathname);
            } catch (error) {
                console.debug("RockItDatabase error, reopening...", error);
                try {
                    RockItDatabase = await openRockItIndexedDB();
                    getRequest = RockItDatabase.transaction("file")
                        .objectStore("file")
                        .get(url.pathname);
                } catch {
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
                                  "Content-Type":
                                      event.target.result.contentType,
                              },
                          })
                        : new Response("Not found", { status: 404 })
                );
            };

            getRequest.onerror = () => {
                resolve(new Response("Cache error", { status: 500 }));
            };
        }
    });
};

// general strategy when making a request (eg if online try to fetch it
// from the network with a timeout, if something fails serve from cache)
self.addEventListener("fetch", (evt) => {
    // console.debug(evt, evt.request);

    if (
        evt.request.url.includes("/api/downloads/status") ||
        evt.request.url.includes("/api/downloads/mark-seen") ||
        evt.request.url.includes("/api/playlist/remove-song") ||
        evt.request.url.includes("/api/playlist/add-song") ||
        evt.request.url.includes("/api/playlist/new") ||
        evt.request.url.includes("/api/like") ||
        evt.request.url.includes("/api/zip-list") ||
        evt.request.url.includes("/api/pin")
    )
        return;
    // if (!evt.request.url.includes("rockit.rockhosting.org")) return
    // if (!evt.request.url.includes("localhost")) return

    evt.respondWith(
        fromNetwork(evt.request).catch(() => fromCache(evt.request))
    );
    // evt.waitUntil(update(evt.request));
});

self.addEventListener("install", () => {
    self.skipWaiting(); // Forces the new SW to take control immediately
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        self.clients.claim() // Takes control of all clients immediately
    );
});
