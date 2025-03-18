let database;

function openRockItAppIndexedDB() {
    const dbOpenRequest = indexedDB.open("RockItApp", 3);

    dbOpenRequest.onupgradeneeded = function () {
        const db = dbOpenRequest.result;
        const songsStore = db.createObjectStore("files", {
            keyPath: "url",
        });
        songsStore.createIndex("url", "url", { unique: true });
        songsStore.createIndex("fileContent", "fileContent", { unique: false });
        songsStore.createIndex("contentType", "contentType", { unique: false });
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
function openRockItIndexedDB() {
    const dbOpenRequest = indexedDB.open("RockIt", 3);

    return new Promise((resolve, reject) => {
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
            if (!database || database) {
                database = await openRockItIndexedDB();
            }

            let getRequest;

            try {
                getRequest = database
                    .transaction("images")
                    .objectStore("images")
                    .get(imageId);
            } catch {
                console.log("Error accessing database, opening it...");
                database = await openRockItIndexedDB();
                getRequest = database
                    .transaction("images")
                    .objectStore("images")
                    .get(imageId);
            }

            getRequest.onsuccess = function (event) {
                // console.debug("Getting image onsuccess", imageId);

                if (!event.target.result) {
                    // console.debug("Getting image result is empty", imageId);

                    const timeoutId = setTimeout(reject, timeout);
                    fetch(request).then((response) => {
                        clearTimeout(timeoutId);
                        resolve(response);
                    }, reject);

                    return;
                }
                // console.debug("Getting image done", imageId);

                resolve(
                    new Response(event.target.result.blob, {
                        headers: {
                            "Content-Type": "image/png",
                        },
                    })
                );
            };
            getRequest.onerror = function () {
                // console.debug("Getting image onerror", imageId);

                const timeoutId = setTimeout(reject, timeout);
                fetch(request).then((response) => {
                    clearTimeout(timeoutId);
                    resolve(response);
                }, reject);

                return;
            };
        });
    }
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(reject, timeout);
        fetch(request).then((response) => {
            clearTimeout(timeoutId);
            resolve(response);
        }, reject);
    });
};

// fetch the resource from the browser cache
const fromCache = (request) => {
    const url = new URL(request.url);

    return new Promise(async (resolve, _) => {
        if (!database || database) {
            database = await openRockItAppIndexedDB();
        }

        // _astro/TogglePlayerUI.C0fEwmnI.js

        let getRequest;

        try {
            getRequest = database
                .transaction("files")
                .objectStore("files")
                .get(url.pathname);
        } catch {
            console.log("Error accessing database, opening it...");
            database = await openRockItAppIndexedDB();
            getRequest = database
                .transaction("files")
                .objectStore("files")
                .get(url.pathname);
        }

        getRequest.onsuccess = function (event) {
            if (!event.target.result) {
                resolve(new Response("You are offline", { status: 404 }));
                return;
            }

            resolve(
                new Response(event.target.result.fileContent, {
                    headers: {
                        "Content-Type": event.target.result.contentType,
                    },
                })
            );
        };
        getRequest.onerror = function () {
            resolve(new Response("You are offline", { status: 404 }));
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
