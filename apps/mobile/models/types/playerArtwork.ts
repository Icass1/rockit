/** Device appearance preference; contains no account or listening data. */
export interface PlayerArtworkPreferenceStore {
    read(): Promise<boolean>;
    write(vinyl: boolean): Promise<void>;
}

export const PLAYER_ARTWORK_PREFERENCE_KEY = "rockit-player-vinyl-mode";
