import {
    RockItAlbumWithSongs,
    RockItQueueSong,
    RockItSongWithAlbum,
    RockItSongWithoutAlbum,
    RockItUser,
} from "@/types/rockIt";
import { Station } from "@/types/station";
import { atom } from "nanostores";
import { getSession, signOut } from "next-auth/react";
import apiFetch from "./utils/apiFetch";
import { SearchResultsResponse } from "@/responses/searchResponse";

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
        throw new Error("Method not implemented.");
    }

    skipForward() {
        throw new Error("Method not implemented.");
    }

    togglePlayPause() {
        throw new Error("Method not implemented.");
    }

    play() {
        throw new Error("Method not implemented.");
    }

    pause() {
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
        const _currentList = currentList.get();
        if (!song.path) {
            console.warn("song.path is undefined. ( Song:", song, ")");
            return;
        }

        if (!_currentList) {
            console.warn("Current list is undefined");
            return;
        }

        if (_currentList.type == undefined || _currentList.id == undefined) {
            console.warn("Current list type or id is undefined");
            return;
        }

        let songsToAdd = currentListSongs
            .filter((song) => song?.path)
            .map((song, index) => {
                return {
                    song: song,
                    list: { type: _currentList.type, id: _currentList.id },
                    index: index,
                };
            });

        if (!window.navigator.onLine) {
            songsToAdd = songsToAdd.filter((song) =>
                songsInIndexedDB.get()?.includes(song.song.id)
            );
        }

        if (randomQueue.get()) {
            const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

            const firstSong = songsToAdd.find(
                (dataSong) => dataSong.song.id == song.id
            );

            if (!firstSong) {
                console.error(
                    "First song not found in songsToAdd in AlbumSong"
                );
                return;
            }

            // Move firstSong to the first position
            const updatedQueue = [
                firstSong,
                ...shuffled.filter((s) => s.index !== firstSong.index),
            ];

            playWhenReady.set(true);
            currentSong.set(song);
            queueIndex.set(firstSong.index); // Since firstSong is now at index 0
            queue.set(updatedQueue);
        } else {
            const firstSong = songsToAdd.find(
                (dataSong) => dataSong.song.id == song.id
            );
            if (!firstSong) {
                console.error(
                    "First song not found in songsToAdd in AlbumSong"
                );
                return;
            }
            playWhenReady.set(true);
            currentSong.set(song);
            queueIndex.set(firstSong.index);
            queue.set(songsToAdd);
        }
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
        const response = await apiFetch(`/spotify-album/${publicId}`, false);
        if (!response?.ok) {
            throw "Error fetching album.";
        }

        const responseJson = await response?.json();

        return RockItAlbumWithSongs.parse(responseJson);
    }
}

class ServiceWorkerManager {
    constructor() {}
}

class NotificationManager {
    constructor() {}
}

class QueueManager {
    // #region: Atoms

    private _currentSongAtom = atom<RockItSongWithoutAlbum | undefined>();
    private _currentListAtom = atom<
        { type: string; publicId: string } | undefined
    >();

    private _queueAtom = atom<RockItQueueSong[]>([]);
    private _queueIndexAtom = atom<number>(0);

    // #endregion: Atoms

    constructor() {}

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

    // #region: Getters

    get songsInIndexedDBAtom() {
        return this._songsInIndexedDBAtom;
    }

    // #endregion: Getters
}

class CurrentListManager {
    // #region: Atoms

    private _currentListSongsAtom = atom<string[]>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

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

    // #endregion: Managers

    constructor() {}
}

export const rockitIt = new RockIt();
