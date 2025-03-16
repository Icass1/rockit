let database;

function openIndexedDB() {
    const dbOpenRequest = indexedDB.open("RockItApp", 1);

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
const fromNetwork = (request, timeout) =>
    new Promise((fulfill, reject) => {
        const timeoutId = setTimeout(reject, timeout);
        fetch(request).then((response) => {
            clearTimeout(timeoutId);
            fulfill(response);
        }, reject);
    });

// fetch the resource from the browser cache
const fromCache = (request) => {
    const url = new URL(request.url);

    return new Promise(async (resolve, _) => {
        if (!database || database) {
            database = await openIndexedDB();
        }

        // _astro/TogglePlayerUI.C0fEwmnI.js

        let getRequest;

        try {
            getRequest = database
                .transaction("files")
                .objectStore("files")
                .get(url.pathname);
        } catch {
            console.log("Error accessing database, opening it...")
            database = await openIndexedDB();
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

    if (evt.request.url.includes("/download-status/")) return
    // if (!evt.request.url.includes("rockit.rockhosting.org")) return
    // if (!evt.request.url.includes("localhost")) return

    evt.respondWith(
        fromNetwork(evt.request, 10000).catch(() => fromCache(evt.request))
    );
    // evt.waitUntil(update(evt.request));
});
