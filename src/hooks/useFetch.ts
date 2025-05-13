import { database } from "@/stores/audio";
import { useState, useEffect } from "react";

export default function useFetch<T>(
    url: string,
    json: boolean = true
): undefined | T {
    const [data, setData] = useState(undefined);

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

        if (json) {
            fetch(url)
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
        }
    }, [url, json]);
    return data;
}
