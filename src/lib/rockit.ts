import { Lang } from "@/types/lang";
import { RockItSearchResults, RockItSongType } from "@/types/rockIt";
import { Station } from "@/types/station";
import { atom } from "nanostores";

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

class LanguageManager {
    // #region: Atoms

    private _langAtom = atom<string | undefined>();
    private _langDataAtom = atom<Lang | undefined>();

    // #endregion: Atoms

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;

        this.init();
        console.log("LanguageManager initialized");
    }

    private async init() {
        const response = await fetch("/api/lang?lang=en");
        const data = await response.json();
        this._langDataAtom.set(data.langFile);
        this._langAtom.set(data.lang);
    }

    // #endregion: Constructor

    // #region: Getters

    get langDataAtom() {
        return this._langDataAtom;
    }

    get langAtom() {
        return this._langAtom;
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

    private _currentSongAtom = atom<RockItSongType | undefined>();
    private _currentListAtom = atom<{ type: string; id: string } | undefined>();

    private _queueAtom = atom<RockItSongType[]>([]);
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

    // #endregion: Atoms

    constructor() {
        console.log("UserManager initialized");
    }

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
}

class StationManager {
    // #region: Atoms

    private _currentStationAtom = atom<Station | undefined>();

    // #endregion: Atoms

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
    private _searchResultsAtom = atom<RockItSearchResults | undefined>();

    // #endregion: Atoms

    constructor() {
        console.log("SearchManager initialized");
    }

    search(query: string) {
        // `/api/radio/stations/${by}/${searchTerm}?limit=10&offset=0`

        this._searchQueryAtom.set(query);
        this._searchingAtom.set(true);
        throw new Error("Method not implemented.");
    }

    // #region: Getters

    get searchQueryAtom() {
        return this._searchQueryAtom;
    }

    // #endregion: Getters
}

export class RockIt {
    audioManager: AudioManager = new AudioManager();
    languageManager: LanguageManager = new LanguageManager();
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
    constructor() {
        console.log("RockIt initialized");
    }
}

export const rockitIt = new RockIt();
