import type { AlbumDB } from "@/lib/db/album";
import type { PlaylistDB } from "@/lib/db/playlist";
import { atom } from "nanostores";

interface LibraryList {
    name: string;
    id: string;
    image: string;
    type: string;
}

export const libraryLists = atom<LibraryList[]>([]);

fetch("/api/user?q=lists").then((response) => {
    if (response.ok) {
        response.json().then((data) => {
            data.lists.map((list: { type: string; id: string }) => {
                fetch(`/api/${list.type}/${list.id}`).then((response) => {
                    if (response.ok) {
                        response.json().then((data: AlbumDB | PlaylistDB) => {
                            libraryLists.set([
                                ...libraryLists.get(),
                                {
                                    name: data.name,
                                    id: data.id,
                                    image: data.image,
                                    type: list.type,
                                },
                            ]);
                        });
                    }
                });
            });
        });
    }
});
