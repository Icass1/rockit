// import { database } from "@/stores/audio";
import { getSession } from "next-auth/react";
import { useState, useEffect, SetStateAction, Dispatch } from "react";

interface UseFetchOptions {
    json?: boolean;
    redis?: boolean;
}

function update(
    json: boolean,
    path: string,
    setData: Dispatch<SetStateAction<undefined>>
) {
    getSession().then((session) => {
        console.log(session?.user.access_token);
        if (json) {
            fetch(`http://localhost:8000${path}`, {
                headers: {
                    Authorization: `Bearer ${session?.user.access_token}`,
                },
            })
                .then((response) => response.json())
                .then((data) => {
                    console.log("Data from server", path, data);
                    setData(data);
                });
        } else {
            console.warn("Not implemented error.");
        }
    });
}

export default function useFetch<T>(
    path: string,
    options?: UseFetchOptions
): [undefined | T, () => void] {
    const [data, setData] = useState(undefined);

    const json = options?.json ?? true;

    useEffect(() => {
        // if (database) {
        //     const apiTransaction = database.transaction("api", "readonly");
        //     const apiStore = apiTransaction.objectStore("api");
        //     const query = apiStore.get(url);
        //     query.onsuccess = function () {
        //         if (query?.result?.data) {
        //             console.log("Data from indexeddb", url);
        //             if (query.result.data.jobId) {
        //                 console.warn(
        //                     "This should not happen, jobId found in indexeddb",
        //                     query.result.data
        //                 );
        //             } else {
        //                 setData(query.result.data);
        //             }
        //         }
        //     };
        // }

        update(json, path, setData);
    }, [path, json]);
    return [data, () => update(json, path, setData)];
}
