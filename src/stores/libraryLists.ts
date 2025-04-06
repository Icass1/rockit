import { UserDB } from "@/lib/db/user";
import { atom } from "nanostores";

interface LibraryList {
    id: string;
    type: string;
}

export const libraryLists = atom<LibraryList[]>([]);

fetch("/api/user?q=lists")
    .then((response) => response.json())
    .then((data: UserDB<"lists">) => {
        console.log(data);
        libraryLists.set(data.lists);
    })
    .catch(() => {
        libraryLists.set([]);
    });
