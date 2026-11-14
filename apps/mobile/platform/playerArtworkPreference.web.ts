import {
    PLAYER_ARTWORK_PREFERENCE_KEY,
    type PlayerArtworkPreferenceStore,
} from "@/models/types/playerArtwork";

export const playerArtworkPreference: PlayerArtworkPreferenceStore = {
    async read() {
        return (
            window.sessionStorage.getItem(PLAYER_ARTWORK_PREFERENCE_KEY) ===
            "true"
        );
    },
    async write(vinyl) {
        window.sessionStorage.setItem(
            PLAYER_ARTWORK_PREFERENCE_KEY,
            String(vinyl)
        );
    },
};
