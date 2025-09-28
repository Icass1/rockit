import {
    RockItAlbumWithSongs,
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
        console.log("AudioManager initialized");
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

    constructor() {
        console.log("SongManager initialized");
    }

    // #endregion: Constructor

    toggleLikeSong(songPublicId: string) {
        console.warn("toggleLikeSong", songPublicId);
        throw new Error("Method not implemented.");
    }

    // #region: Getters

    get likedSongsAtom() {
        return this._likedSongsAtom;
    }

    // #endregion: Getters
}

class PlaylistManager {
    constructor() {
        console.log("PlaylistManager initialized");
    }
}

class AlbumManager {
    constructor() {
        console.log("AlbumManager initialized");
    }

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
    constructor() {
        console.log("ServiceWorkerManager initialized");
    }
}

class NotificationManager {
    constructor() {
        console.log("NotificationManager initialized");
    }
}

class QueueManager {
    // #region: Atoms

    private _currentSongAtom = atom<RockItSongWithoutAlbum | undefined>();
    private _currentListAtom = atom<{ type: string; id: string } | undefined>();

    private _queueAtom = atom<RockItSongWithoutAlbum[]>([]);
    private _queueIndexAtom = atom<number>(0);

    // #endregion: Atoms

    constructor() {
        console.log("QueueManager initialized");
    }

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
    constructor() {
        console.log("WebSocketManager initialized");
    }
}

class DownloaderManager {
    constructor() {
        console.log("DownloaderManager initialized");
    }
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
        console.log("UserManager initialized");
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

    constructor() {
        console.log("StationManager initialized");
    }

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

    constructor() {
        console.log("PlayerUIManager initialized");
    }

    // #endregion: Constructor

    show() {
        this._visibleAtom.set(true);
    }
    hide() {
        this._visibleAtom.set(false);
    }
    toggle() {
        this._visibleAtom.set(!this._visibleAtom.get());
    }

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

    constructor() {
        console.log("SearchManager initialized");
    }

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

    // #endregion: Managers

    constructor() {
        console.log("RockIt initialized");
    }
}

export const rockitIt = new RockIt();
