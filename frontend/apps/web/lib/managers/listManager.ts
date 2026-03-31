import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    DBListType,
    LibraryListsResponse,
    LibraryListsResponseSchema,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";
import { baseApiFetch } from "@/lib/utils/apiFetch";

export class ListManager {
    private _libraryListsAtom = createArrayAtom<{
        publicId: string;
        type: DBListType;
    }>([]);

    async initLibrary() {
        const res = await baseApiFetch("/user/library");
        if (!res?.ok) return;
        const json = await res.json();
        const data = LibraryListsResponseSchema.parse(json);

        const lists: { publicId: string; type: DBListType }[] = [];

        for (const album of data.albums) {
            lists.push({ publicId: album.publicId, type: "album" });
        }
        for (const playlist of data.playlists) {
            lists.push({ publicId: playlist.publicId, type: "playlist" });
        }

        this._libraryListsAtom.set(lists);
    }

    async addListToLibraryAsync(type: DBListType, publicId: string) {
        const response = await baseApiFetch(
            `/user/library/${type}/${publicId}`,
            {
                method: "POST",
            }
        );

        if (!response?.ok) {
            rockIt.notificationManager.notifyError(
                "Unable to add list to library."
            );
            return;
        }

        this._libraryListsAtom.push({ publicId, type });
        rockIt.notificationManager.notifySuccess("List added to library.");
    }

    async removeListFromLibraryAsync(type: DBListType, publicId: string) {
        const response = await baseApiFetch(
            `/user/library/${type}/${publicId}`,
            {
                method: "DELETE",
            }
        );

        if (!response?.ok) {
            rockIt.notificationManager.notifyError(
                "Unable to remove list from library."
            );
            return;
        }

        const current = this._libraryListsAtom.get();
        this._libraryListsAtom.set(
            current.filter((l) => l.publicId !== publicId)
        );
        rockIt.notificationManager.notifySuccess("List removed from library.");
    }

    async toggleListInLibraryAsync(type: DBListType, publicId: string) {
        if (this.listInLibrary(publicId)) {
            await this.removeListFromLibraryAsync(type, publicId);
        } else {
            await this.addListToLibraryAsync(type, publicId);
        }
    }

    listInLibrary(publicId: string) {
        return this._libraryListsAtom
            .get()
            .some((list) => list.publicId === publicId);
    }

    async likeAllSongsAsync(type: DBListType, publicId: string) {
        let songPublicIds: string[];

        try {
            const res = await baseApiFetch(`/media/${type}/${publicId}`);
            if (!res?.ok) {
                rockIt.notificationManager.notifyError(
                    `Failed to fetch ${type}`
                );
                return;
            }
            const data = await res.json();
            const songs = data.songs || [];
            songPublicIds = songs.map(
                (song: { publicId: string }) => song.publicId
            );
        } catch (error) {
            rockIt.notificationManager.notifyError(
                `Error fetching list: ${error}`
            );
            return;
        }

        if (songPublicIds.length === 0) {
            rockIt.notificationManager.notifyError("No songs found to like.");
            return;
        }

        const response = await baseApiFetch("/user/like/songs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ song_public_ids: songPublicIds }),
        });

        if (!response?.ok) {
            rockIt.notificationManager.notifyError("Unable to like all songs.");
            return;
        }

        const current = rockIt.mediaManager.likedMediaAtom.get();
        const newLiked = [...new Set([...current, ...songPublicIds])];
        rockIt.mediaManager.likedMediaAtom.set(newLiked);

        rockIt.notificationManager.notifySuccess("All songs liked.");
    }

    get libraryListsAtom() {
        return this._libraryListsAtom.getReadonlyAtom();
    }
}
