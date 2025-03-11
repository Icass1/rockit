import { atom } from "nanostores";

interface PinnedList {
    name: string;
    id: string;
    image: string;
    type: string;
}

export const pinnedLists = atom<PinnedList[]>([]);

fetch("/api/user/pinned-lists")
    .then((response) => {
        if (response.ok) {
            response.json().then((data) => {
                pinnedLists.set(data);
            });
        }
    })
    .catch(() => pinnedLists.set([]));
