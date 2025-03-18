let database;

function openRockItAppIndexedDB() {
    const dbOpenRequest = indexedDB.open("RockItApp", 5);

    return new Promise((resolve, reject) => {
        dbOpenRequest.onsuccess = function () {
            resolve(dbOpenRequest.result);
        };
        dbOpenRequest.onupgradeneeded = function () {
            const db = dbOpenRequest.result;
            const filesStore = db.createObjectStore("files", {
                keyPath: "url",
            });
            filesStore.createIndex("url", "url", { unique: true });
            filesStore.createIndex("fileContent", "fileContent", {
                unique: false,
            });
            filesStore.createIndex("contentType", "contentType", {
                unique: false,
            });
        };

        dbOpenRequest.onerror = function () {
            reject(dbOpenRequest.error);
        };
    });
}
function fillImagesIndexedDB(imageStore) {
    console.warn("fillImagesIndexedDB");
    if (!imageStore.indexNames.contains("id"))
        imageStore.createIndex("id", "id", { unique: true });
    if (!imageStore.indexNames.contains("blob"))
        imageStore.createIndex("blob", "blob", { unique: false });
}

function fillSongsIndexedDB(songsStore) {
    console.warn("fillSongsIndexedDB");
    if (!songsStore.indexNames.contains("id"))
        songsStore.createIndex("id", "id", { unique: true });
    if (!songsStore.indexNames.contains("name"))
        songsStore.createIndex("name", "name", { unique: false });
    if (!songsStore.indexNames.contains("artists"))
        songsStore.createIndex("artists", "artists", { unique: false });
    if (!songsStore.indexNames.contains("images"))
        songsStore.createIndex("images", "images", { unique: false });
    if (!songsStore.indexNames.contains("image"))
        songsStore.createIndex("image", "image", { unique: false });
    if (!songsStore.indexNames.contains("duration"))
        songsStore.createIndex("duration", "duration", {
            unique: false,
        });
    if (!songsStore.indexNames.contains("blob"))
        songsStore.createIndex("blob", "blob", { unique: false });
    if (!songsStore.indexNames.contains("albumId"))
        songsStore.createIndex("albumId", "albumId", { unique: false });
    if (!songsStore.indexNames.contains("albumName"))
        songsStore.createIndex("albumName", "albumName", {
            unique: false,
        });
    if (!songsStore.indexNames.contains("lyrics"))
        songsStore.createIndex("lyrics", "lyrics", { unique: false });
    if (!songsStore.indexNames.contains("dynamicLyrics"))
        songsStore.createIndex("dynamicLyrics", "dynamicLyrics", {
            unique: false,
        });
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
    if (!userStore.indexNames.contains("username"))
        userStore.createIndex("username", "username", {
            unique: false,
        });
    if (!userStore.indexNames.contains("currentSong"))
        userStore.createIndex("currentSong", "currentSong", {
            unique: false,
        });
    if (!userStore.indexNames.contains("lang"))
        userStore.createIndex("lang", "lang", { unique: false });
    if (!userStore.indexNames.contains("currentTime"))
        userStore.createIndex("currentTime", "currentTime", {
            unique: false,
        });
    if (!userStore.indexNames.contains("queue"))
        userStore.createIndex("queue", "queue", { unique: false });
    if (!userStore.indexNames.contains("queueIndex"))
        userStore.createIndex("queueIndex", "queueIndex", {
            unique: false,
        });
    if (!userStore.indexNames.contains("volume"))
        userStore.createIndex("volume", "volume", { unique: false });
    if (!userStore.indexNames.contains("randomQueue"))
        userStore.createIndex("randomQueue", "randomQueue", {
            unique: false,
        });
    if (!userStore.indexNames.contains("repeatSong"))
        userStore.createIndex("repeatSong", "repeatSong", {
            unique: false,
        });
    if (!userStore.indexNames.contains("currentStation"))
        userStore.createIndex("currentStation", "currentStation", {
            unique: false,
        });
    if (!userStore.indexNames.contains("admin"))
        userStore.createIndex("admin", "admin", { unique: false });
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
                fillSongsIndexedDB(songsStore);
            } else {
                fillSongsIndexedDB(transaction.objectStore("songs"));
            }

            ////////////////
            // imageStore //
            ////////////////
            if (!db.objectStoreNames.contains("images")) {
                const imageStore = db.createObjectStore("images", {
                    keyPath: "id",
                });
                fillImagesIndexedDB(imageStore);
            } else {
                fillImagesIndexedDB(transaction.objectStore("images"));
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
const fromNetwork = (request, timeout) => {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/image/")) {
        const imageId = url.pathname.replace("/api/image/", "").split("_")[0];

        // console.debug("Getting image from indexeddb", imageId);

        return new Promise(async (resolve, reject) => {
            // Fix 1: Correct database existence check
            if (!database) {
                // console.debug("Opening RockIt database");
                try {
                    database = await openRockItIndexedDB();
                } catch (error) {
                    console.error("Failed to open database:", error);
                    return reject(error);
                }
            }

            let getRequest;
            try {
                getRequest = database
                    .transaction("images")
                    .objectStore("images")
                    .get(imageId);
            } catch (error) {
                console.log("Database error, reopening...", error);
                try {
                    database = await openRockItIndexedDB();
                    getRequest = database
                        .transaction("images")
                        .objectStore("images")
                        .get(imageId);
                } catch (retryError) {
                    console.error("Failed to reopen database:", retryError);
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

    return new Promise(async (resolve) => {
        // Fix 2: Correct database existence check
        if (!database) {
            // console.debug("Opening RockItApp database");
            try {
                database = await openRockItAppIndexedDB();
            } catch (error) {
                console.error("Failed to open database:", error);
                return resolve(
                    new Response("You are offline", { status: 404 })
                );
            }
        }

        let getRequest;
        try {
            getRequest = database
                .transaction("files")
                .objectStore("files")
                .get(url.pathname);
        } catch (error) {
            console.log("Database error, reopening...", error);
            try {
                database = await openRockItAppIndexedDB();
                getRequest = database
                    .transaction("files")
                    .objectStore("files")
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
