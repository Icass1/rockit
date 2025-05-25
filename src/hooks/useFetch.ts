import { database } from "@/stores/audio";
import { useState, useEffect } from "react";

interface UseFetchOptions {
    json?: boolean;
    redis?: boolean;
}

export default function useFetch<T>(
    url: string,
    options?: UseFetchOptions
): undefined | T {
    const [data, setData] = useState(undefined);

    const json = options?.json ?? true;
    const redis = options?.redis ?? false;

    useEffect(() => {
        if (database) {
            const apiTransaction = database.transaction("api", "readonly");
            const apiStore = apiTransaction.objectStore("api");
            const query = apiStore.get(url);
            query.onsuccess = function () {
                if (query?.result?.data) {
                    console.log("Data from indexeddb", url);
                    setData(query.result.data);
                }
            };
        }

        const controller = new AbortController();

        if (json && !redis) {
            fetch(url, { signal: controller.signal })
                .then((response) => response.json())
                .then((data) => {
                    console.log("Data from server", url);

                    setData(data);
                    if (database) {
                        const apiTransaction = database.transaction(
                            "api",
                            "readwrite"
                        );
                        const apiStore = apiTransaction.objectStore("api");
                        const apiEntry = {
                            url,
                            data,
                            timestamp: Date.now(),
                        };

                        apiStore.put(apiEntry);
                    }
                });
        } else if (redis && json) {
            fetch(url)
                .then((res) => res.json())
                .then(({ jobId }) => {
                    const interval = setInterval(() => {
                        const fetchUrl = new URL(url, location.origin);
                        fetchUrl.searchParams.append("jobId", jobId);

                        fetch(fetchUrl)
                            .then((res) => res.json())
                            .then(({ state, result }) => {
                                if (state === "completed") {
                                    console.log("Data from server", url);

                                    setData(result);
                                    if (database) {
                                        const apiTransaction =
                                            database.transaction(
                                                "api",
                                                "readwrite"
                                            );
                                        const apiStore =
                                            apiTransaction.objectStore("api");
                                        const apiEntry = {
                                            url,
                                            data: result,
                                            timestamp: Date.now(),
                                        };

                                        apiStore.put(apiEntry);
                                    }
                                    clearInterval(interval);
                                }
                            });
                    }, 2000);
                });
        } else {
            console.warn("to implement");
        }

        return () => {
            // Cancel fetch on unmount
            controller.abort("Component unmounted, fetch aborted");
        };
    }, [url, json, redis]);
    return data;
}
