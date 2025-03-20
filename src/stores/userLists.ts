import type { UserDB } from "@/lib/db/user";
import { atom } from "nanostores";
export let data: string[] = [];

export const userLists = atom<{ id: string; name: string; image: string }[]>(
    []
);
export function updateUserLists() {
    fetch("/api/user?q=lists")
        .then((response) => response.json())
        .then((data: UserDB<"lists">) => {
            if (
                data.lists
                    .filter((list) => list.type == "playlist")
                    .map((list) => list.id).length > 0
            )
                fetch(
                    `/api/playlists?playlists=${data.lists
                        .filter((list) => list.type == "playlist")
                        .map((list) => list.id)
                        .join()}&p=id,name,image`
                )
                    .then((response) => response.json())
                    .then(
                        (
                            data: {
                                id: string;
                                name: string;
                                image: string;
                            }[]
                        ) => {
                            if (data) userLists.set(data);
                        }
                    );
        })
        .catch(() => userLists.set([]));
}

updateUserLists();
