import { atom } from "nanostores";

interface PinnedList {
    name: string;
    id: string;
    image: string;
    type: string;
}

export const pinnedLists = atom<PinnedList[]>([]);

fetch("/api/user/pinnedLists").then((response) => {
    if (response.ok) {
        response.json().then((data) => {
            console.log(data);
            pinnedLists.set(data);
        });
    }
});
