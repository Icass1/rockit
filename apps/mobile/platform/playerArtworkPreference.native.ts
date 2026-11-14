import * as SecureStore from "expo-secure-store";
import {
    PLAYER_ARTWORK_PREFERENCE_KEY,
    type PlayerArtworkPreferenceStore,
} from "@/models/types/playerArtwork";

export const playerArtworkPreference: PlayerArtworkPreferenceStore = {
    async read() {
        return (
            (await SecureStore.getItemAsync(PLAYER_ARTWORK_PREFERENCE_KEY)) ===
            "true"
        );
    },
    async write(vinyl) {
        await SecureStore.setItemAsync(
            PLAYER_ARTWORK_PREFERENCE_KEY,
            String(vinyl)
        );
    },
};
