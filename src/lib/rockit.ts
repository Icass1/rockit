import {
    RockItAlbumWithSongs,
    RockItQueueSong,
    RockItSongWithAlbum,
    RockItUser,
} from "@/types/rockIt";
import { Station } from "@/types/station";
import { atom } from "nanostores";
import { getSession, signOut } from "next-auth/react";
import apiFetch from "./utils/apiFetch";
import { SearchResultsResponse } from "@/responses/searchResponse";
import { StartDownloadResponse } from "@/responses/startDownloadResponse";

const RESPONSE_UNDEFINED_MESSAGE = "Response is undefined.";

class AudioManager {
    private _audio?: HTMLAudioElement;

    // #region: Atoms

    private _playingAtom = atom<boolean>(false);
    private _loadingAtom = atom<boolean>(false);
    private _currentTimeAtom = atom<number>(0);
    private _currentVolume = atom<number>(0);

    // #endregion: Atoms

    private _mutePreviousVolume?: number;

    private _muted = false;

    constructor() {
        if (typeof window === "undefined") return;

        this._audio = new Audio();
    }

    skipBack() {
        throw new Error("(skipBack) Method not implemented.");
    }

    skipForward() {
        throw new Error("(skipForward) Method not implemented.");
    }

    togglePlayPause() {
        throw new Error("(togglePlayPause) Method not implemented.");
    }

    togglePlayPauseOrSetSong() {
        throw new Error("(togglePlayPauseOrSetSong) Method not implemented.");
    }

    play() {
        throw new Error("(play) Method not implemented.");
    }

    pause() {
        throw new Error("(pause) Method not implemented.");
    }

    mute() {
        if (!this._audio) {
            console.warn("Audio element not initialized");
            return false;
        }
        this._mutePreviousVolume = this.volume;
        this.volume = 0;
        this._muted = true;
    }

    unmute() {
        if (!this._audio) {
            console.warn("Audio element not initialized");
            return false;
        }
        if (this._mutePreviousVolume !== undefined) {
            this.volume = this._mutePreviousVolume;
            this._mutePreviousVolume = undefined;
        } else {
            console.warn("No previous volume stored.");
        }
        this._muted = false;
    }

    toggleMute() {
        if (!this._audio) {
            console.warn("Audio element not initialized");
            return false;
        }
        if (this._muted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    setCurrentTime(time: number) {
        console.warn("setCurrentTime", time);
        throw new Error("Method not implemented.");
    }

    setSrc() {
        throw new Error("Method not implemented.");
    }

    // #region: Setters

    set volume(value: number) {
        if (!this._audio) {
            console.warn("Audio element not initialized");
            return;
        }
        this._audio.volume = value;
        this._currentVolume.set(value);
    }
    // #endregion: Setters

    // #region: Getters

    get volume(): number {
        if (!this._audio) {
            console.warn("Audio element not initialized");
            return 1;
        }
        return this._audio?.volume;
    }
    get playingAtom() {
        return this._playingAtom;
    }

    get loadingAtom() {
        return this._loadingAtom;
    }

    get currentTimeAtom() {
        return this._currentTimeAtom;
    }
    get volumeAtom() {
        return this._currentVolume;
    }

    // #endregion: Getters
}

class SongManager {
    // #region: Atoms

    private _likedSongsAtom = atom<string[]>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    toggleLikeSong(songPublicId: string) {
        //  if (rockitIt.songManager.likedSongsAtom.get().includes(song.publicId)) {
        //                             fetch(`/api/like/${song.publicId}`, {
        //                                 method: "DELETE",
        //                             }).then((response) => {
        //                                 if (response.ok) {
        //                                     // Remove song to liked songs store
        //                                     likedSongs.set(
        //                                         likedSongs
        //                                             .get()
        //                                             .filter(
        //                                                 (likedSong) =>
        //                                                     likedSong != song.publicId
        //                                             )
        //                                     );
        //                                 } else {
        //                                     console.log("Error");
        //                                     // Tell user like request was unsuccessful
        //                                 }
        //                             });
        //                         } else {
        //                             fetch(`/api/like/${song.publicId}`, {
        //                                 method: "POST",
        //                             }).then((response) => {
        //                                 if (response.ok) {
        //                                     // Add song to liked songs store
        //                                     likedSongs.set([
        //                                         ...likedSongs.get(),
        //                                         song.publicId,
        //                                     ]);
        //                                 } else {
        //                                     console.log("Error");
        //                                     // Tell user like request was unsuccessful
        //                                 }
        //                             });
        //                         }

        console.warn("toggleLikeSong", songPublicId);
        throw new Error("Method not implemented.");
    }

    playSong(song: RockItSongWithAlbum) {
        console.log(song);
        throw new Error("Method not implemented.");
        // const _currentList = currentList.get();
        // if (!song.path) {
        //     console.warn("song.path is undefined. ( Song:", song, ")");
        //     return;
        // }

        // if (!_currentList) {
        //     console.warn("Current list is undefined");
        //     return;
        // }

        // if (_currentList.type == undefined || _currentList.id == undefined) {
        //     console.warn("Current list type or id is undefined");
        //     return;
        // }

        // let songsToAdd = currentListSongs
        //     .filter((song) => song?.path)
        //     .map((song, index) => {
        //         return {
        //             song: song,
        //             list: { type: _currentList.type, id: _currentList.id },
        //             index: index,
        //         };
        //     });

        // if (!window.navigator.onLine) {
        //     songsToAdd = songsToAdd.filter((song) =>
        //         songsInIndexedDB.get()?.includes(song.song.id)
        //     );
        // }

        // if (randomQueue.get()) {
        //     const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

        //     const firstSong = songsToAdd.find(
        //         (dataSong) => dataSong.song.id == song.id
        //     );

        //     if (!firstSong) {
        //         console.error(
        //             "First song not found in songsToAdd in AlbumSong"
        //         );
        //         return;
        //     }

        //     // Move firstSong to the first position
        //     const updatedQueue = [
        //         firstSong,
        //         ...shuffled.filter((s) => s.index !== firstSong.index),
        //     ];

        //     playWhenReady.set(true);
        //     currentSong.set(song);
        //     queueIndex.set(firstSong.index); // Since firstSong is now at index 0
        //     queue.set(updatedQueue);
        // } else {
        //     const firstSong = songsToAdd.find(
        //         (dataSong) => dataSong.song.id == song.id
        //     );
        //     if (!firstSong) {
        //         console.error(
        //             "First song not found in songsToAdd in AlbumSong"
        //         );
        //         return;
        //     }
        //     playWhenReady.set(true);
        //     currentSong.set(song);
        //     queueIndex.set(firstSong.index);
        //     queue.set(songsToAdd);
        // }
    }

    // #region: Getters

    get likedSongsAtom() {
        return this._likedSongsAtom;
    }

    // #endregion: Getters
}

class PlaylistManager {
    constructor() {}
}

class AlbumManager {
    constructor() {}

    async getSpotifyAlbumAsync(publicId: string) {
        const response = await apiFetch(`/spotify-album/${publicId}`, {
            auth: false,
        });
        if (!response?.ok) {
            throw "Error fetching album.";
        }

        const responseJson = await response?.json();

        return RockItAlbumWithSongs.parse(responseJson);
    }

    async playAlbum(
        songs: RockItSongWithAlbum[],
        listType: "album" | "playlist",
        listPublicId: string,
        startSongPublicId?: string
    ) {
        rockitIt.queueManager.setSongs(songs, listType, listPublicId);

        if (startSongPublicId)
            rockitIt.queueManager.moveToSong(startSongPublicId);
        else rockitIt.queueManager.setIndex(0);

        rockitIt.audioManager.play();
    }
}

class ListManager {
    private _libraryListsAtom = atom<
        { publicId: string; type: "album" | "playlist" }[]
    >([]);
    private _pinnedListsAtom = atom<
        { publicId: string; type: "album" | "playlist" }[]
    >([]);

    constructor() {}

    // #region: Mehtods

    async addListToLibraryAsync(type: "album" | "playlist", publicId: string) {
        const response = await apiFetch(
            `/library/add-list/${type}/${publicId}`
        );

        if (!response) {
            rockitIt.notificationManager.notifyError(
                RESPONSE_UNDEFINED_MESSAGE
            );
            return;
        }
        if (!response?.ok) {
            rockitIt.notificationManager.notifyError(
                "Unable to add list to library."
            );
            return;
        }
        this._libraryListsAtom.set([
            ...this._libraryListsAtom.get(),
            { publicId, type },
        ]);
        rockitIt.notificationManager.notifyInfo("List added to library.");
    }

    async removeListFromLibraryAsync(
        type: "album" | "playlist",
        publicId: string
    ) {
        const response = await apiFetch(
            `/library/remove-list/${type}/${publicId}`
        );

        if (!response) {
            rockitIt.notificationManager.notifyError(
                RESPONSE_UNDEFINED_MESSAGE
            );
            return;
        }
        if (!response.ok) {
            rockitIt.notificationManager.notifyError(
                "Unable to remove list from library."
            );
            return;
        }
        this._libraryListsAtom.set([
            ...this._libraryListsAtom
                .get()
                .filter((list) => list.publicId !== publicId),
        ]);
        rockitIt.notificationManager.notifyInfo("List removed from library.");
    }

    async toggleListInLibraryAsync(
        type: "album" | "playlist",
        publicId: string
    ) {
        if (this.listInLibrary(publicId))
            await this.removeListFromLibraryAsync(type, publicId);
        else await this.addListToLibraryAsync(type, publicId);
    }

    listInLibrary(publicId: string) {
        return this._libraryListsAtom
            .get()
            .some((list) => list.publicId == publicId);
    }

    async pinListAsync(type: "album" | "playlist", publicId: string) {
        const response = await apiFetch(`/pin/${type}/${publicId}`, {
            headers: { method: "POST" },
        });

        if (!response) {
            rockitIt.notificationManager.notifyError(
                RESPONSE_UNDEFINED_MESSAGE
            );
            return;
        }
        if (!response.ok) {
            rockitIt.notificationManager.notifyError(
                "Unable to remove list from library."
            );
            return;
        }
        this._pinnedListsAtom.set([
            ...this._pinnedListsAtom.get(),
            { publicId, type },
        ]);
        rockitIt.notificationManager.notifyInfo("List pinned.");
    }

    async unPinListAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async togglePinListAsync(type: "album" | "playlist", publicId: string) {
        if (this.listIsPinned(publicId))
            await this.removeListFromLibraryAsync(type, publicId);
        else await this.addListToLibraryAsync(type, publicId);
    }

    listIsPinned(publicId: string) {
        return this._pinnedListsAtom
            .get()
            .some((list) => list.publicId == publicId);
    }

    async likeAllSongsAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async addListToTopQueueAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async addListToBottomQueueAsync(
        type: "album" | "playlist",
        publicId: string
    ) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async downloadListZipAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
        // const response = await apiFetch(`/zip-list/${type}/${id}`);

        // if (!response) {
        //     rockitIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
        //     return;
        // }
        // if (!response.ok) {
        //     rockitIt.notificationManager.notifyError("Unable to zip list.");
        //     return;
        // }
        // const jobId = (await response.json()).jobId;

        // const interval = setInterval(async () => {
        //     const response = await fetch(
        //         `/api/zip-list/${type}/${id}?jobId=${jobId}`
        //     );
        //     if (!response.ok) {
        //         console.warn("Response not ok");
        //         clearInterval(interval);
        //         return;
        //     }

        //     const json = await response.json();

        //     if (json.state == "completed") {
        //         const resultId = json.result;

        //         const a = document.createElement("a");
        //         const url = `/api/zip-list/${type}/${id}?getId=${resultId}`;

        //         a.href = url;

        //         document.body.appendChild(a);
        //         a.click();

        //         // Cleanup
        //         a.remove();
        //         window.URL.revokeObjectURL(url);
        //         clearInterval(interval);
        //     }
        // }, 2000);
    }

    // #endregion

    get libraryListsAtom() {
        return this._libraryListsAtom;
    }

    get pinnedListsAtom() {
        return this._pinnedListsAtom;
    }
}

class ServiceWorkerManager {
    constructor() {}
}

class NotificationManager {
    constructor() {}

    notifyError(message: string) {
        console.error(message);
    }
    notifyInfo(message: string) {
        console.info(message);
    }
}

class QueueManager {
    // #region: Atoms

    private _currentSongAtom = atom<RockItSongWithAlbum | undefined>();
    private _currentListAtom = atom<
        { type: string; publicId: string } | undefined
    >();

    private _queueAtom = atom<RockItQueueSong[]>([]);
    private _queueIndexAtom = atom<number>(0);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setSongs(
        songs: RockItSongWithAlbum[],
        listType: "album" | "playlist",
        listPublicId: string
    ) {
        this._queueAtom.set(
            songs.map((song, index) => {
                return {
                    list: { type: listType, publicId: listPublicId },
                    song,
                    index: index,
                };
            })
        );
    }

    moveToSong(publicId: string) {
        console.log(this._queueAtom.get());

        const song = this._queueAtom
            .get()
            .find((song) => song.song.publicId == publicId);
        if (!song) {
            rockitIt.notificationManager.notifyError(
                "(moveToSong) Song not found in queue."
            );
            return;
        }
        this._queueIndexAtom.set(song.index);
        this._currentSongAtom.set(song.song);
    }

    setIndex(index: number) {
        this._queueIndexAtom.set(index);
        const song = this._queueAtom.get().find((song) => song.index == index);

        if (!song) {
            rockitIt.notificationManager.notifyError(
                "(setIndex) Song not found in queue."
            );
            return;
        }
        this._currentSongAtom.set(song.song);
    }

    // #endregion: Methods

    // #region: Getters

    get currentSongAtom() {
        return this._currentSongAtom;
    }
    get currentListAtom() {
        return this._currentListAtom;
    }
    get queueAtom() {
        return this._queueAtom;
    }
    get queueIndexAtom() {
        return this._queueIndexAtom;
    }

    // #endregion: Getters
}

class WebSocketManager {
    constructor() {}
}

class DownloaderManager {
    // #region: Atoms

    private _downloadedListsAtom = atom<string[]>([]);

    // #endregion: Getters

    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    async downloadListToDBAsync(type: "album" | "playlist", publicId: string) {
        const url = `https://open.spotify.com/${type}/${publicId}`;

        const response = await apiFetch(`/start-download?user=1&url=${url}`);

        if (!response) {
            rockitIt.notificationManager.notifyError(
                RESPONSE_UNDEFINED_MESSAGE
            );
            return;
        }
        if (!response.ok) {
            rockitIt.notificationManager.notifyError(
                "Unable to start download."
            );
            return;
        }

        const responseJson = await response.json();
        const startDownload = StartDownloadResponse.parse(responseJson);

        console.log(startDownload.downloadId);

        const eventSource = new EventSource(
            `${rockitIt.BACKEND_URL}/download-status?id=${startDownload.downloadId}`
        );

        eventSource.onerror = (ev: Event) => {
            this.handleEventSourceError(eventSource, ev);
        };

        eventSource.onmessage = (ev: MessageEvent) => {
            this.handleEventSourceMessage(eventSource, ev);
        };

        eventSource.onopen = (ev: Event) => {
            this.handleEventSourceOpen(eventSource, ev);
        };
    }

    // #endregion: Methods

    // #region: Handlers

    private handleEventSourceError(eventSource: EventSource, ev: Event) {
        console.log(`Error in ${eventSource.url} ${ev}`);
    }

    private handleEventSourceMessage(
        eventSource: EventSource,
        ev: MessageEvent
    ) {
        console.log(`Message from ${eventSource.url} ${ev.data}`);
    }

    private handleEventSourceOpen(eventSource: EventSource, ev: Event) {
        console.log(`Event source open ${eventSource.url} ${ev}`);
    }

    // #endregion: Handlers

    // #region: Getters

    get downloadedListsAtom() {
        return this._downloadedListsAtom;
    }

    // #endregion: Getters
}

class UserManager {
    // #region: Atoms

    private _randomQueueAtom = atom<boolean>(false);
    private _repeatSongAtom = atom<"all" | "one" | "off">("off");

    private _userAtom = atom<RockItUser | undefined>();

    // #endregion

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
        this.init();
    }

    private async init() {
        const session = await getSession();
        if (!session) {
            console.warn("No session found in UserManager");
        }

        const response = await apiFetch("/me");
        if (!response?.ok) {
            console.warn("No response from /me");
            signOut();
            window.location.href = "/login";
            return;
        }

        const responseJson = await response.json();
        const user = RockItUser.parse(responseJson);

        this._userAtom.set(user);
    }

    // #endregion

    // #region: Methods
    toggleRandomQueue() {
        this._randomQueueAtom.set(!this._randomQueueAtom.get());
    }

    cyclerepeatSong() {
        this._repeatSongAtom.set(
            this._repeatSongAtom.get() === "off"
                ? "all"
                : this._repeatSongAtom.get() === "all"
                  ? "one"
                  : "off"
        );
    }

    // #endregion

    // #region: Getters

    get randomQueueAtom() {
        return this._randomQueueAtom;
    }
    get repeatSongAtom() {
        return this._repeatSongAtom;
    }

    get userAtom() {
        return this._userAtom;
    }

    // #endregion
}

class StationManager {
    // #region: Atoms

    private _currentStationAtom = atom<Station | undefined>();

    // #endregion

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Getters

    get currentStationAtom() {
        return this._currentStationAtom;
    }

    // #endregion: Getters
}

class PlayerUIManager {
    // #region: Atoms

    private _visibleAtom = atom<boolean>(true);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    show() {
        this._visibleAtom.set(true);
    }
    hide() {
        this._visibleAtom.set(false);
    }
    toggle() {
        this._visibleAtom.set(!this._visibleAtom.get());
    }

    // #endregion

    // #region: Getters

    get visibleAtom() {
        return this._visibleAtom;
    }

    // #endregion: Getters
}

class SearchManager {
    // #region: Atoms

    private _searchQueryAtom = atom<string>("");
    private _searchingAtom = atom<boolean>(false);
    private _searchResultsAtom = atom<SearchResultsResponse | undefined>();

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    search(query: string) {
        // `/api/radio/stations/${by}/${searchTerm}?limit=10&offset=0`

        this._searchQueryAtom.set(query);
        this._searchingAtom.set(true);

        apiFetch("/search?query=" + encodeURIComponent(query)).then((data) => {
            if (!data?.ok) {
                console.warn("No response from /search");
                this._searchingAtom.set(false);
                return;
            }

            data.json().then((json) => {
                try {
                    const results = SearchResultsResponse.parse(json);
                    this._searchResultsAtom.set(results);
                } catch (e) {
                    console.error("Error parsing search results", e, json);
                } finally {
                    this._searchingAtom.set(false);
                }
            });
        });
    }

    // #endregion

    // #region: Getters

    get searchQueryAtom() {
        return this._searchQueryAtom;
    }

    get searchResultsAtom() {
        return this._searchResultsAtom;
    }

    get searchingAtom() {
        return this._searchingAtom;
    }

    // #endregion: Getters
}

class IndexedDBManager {
    // #region: Atoms

    private _songsInIndexedDBAtom = atom<string[]>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    async downloadListToDeviceAsync(
        type: "album" | "playlist",
        publicId: string,
        internalImageUrl?: string
    ) {
        console.log(type, publicId, internalImageUrl);
        throw "Not implemented method";
    }

    // #endregion: Methods

    // #region: Getters

    get songsInIndexedDBAtom() {
        return this._songsInIndexedDBAtom;
    }

    // #endregion: Getters
}

class CurrentListManager {
    // #region: Atoms

    private _currentListSongsAtom = atom<RockItSongWithAlbum[]>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setCurrentListSongs(songs: RockItSongWithAlbum[]) {
        this._currentListSongsAtom.set(songs);
    }

    // #endregion: Methods

    // #region: Getters

    get currentListSongsAtom() {
        return this._currentListSongsAtom;
    }

    // #endregion: Getters
}

export class RockIt {
    // #region: Constants

    public VERSION = "0.1.0";

    public BACKEND_URL = "http://localhost:8000";

    // #endregion: Constants

    // #region: Managers

    audioManager: AudioManager = new AudioManager();
    songManager: SongManager = new SongManager();
    playlistManager: PlaylistManager = new PlaylistManager();
    albumManager: AlbumManager = new AlbumManager();
    serviceWorkerManager: ServiceWorkerManager = new ServiceWorkerManager();
    notificationManager: NotificationManager = new NotificationManager();
    queueManager: QueueManager = new QueueManager();
    webSocketManager: WebSocketManager = new WebSocketManager();
    downloaderManager: DownloaderManager = new DownloaderManager();
    userManager: UserManager = new UserManager();
    stationManager: StationManager = new StationManager();
    playerUIManager: PlayerUIManager = new PlayerUIManager();
    searchManager: SearchManager = new SearchManager();
    indexedDBManager: IndexedDBManager = new IndexedDBManager();
    currentListManager: CurrentListManager = new CurrentListManager();
    listManager: ListManager = new ListManager();

    // #endregion: Managers

    constructor() {}
}

export const rockitIt = new RockIt();
