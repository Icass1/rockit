import apiFetch from "@/lib/utils/apiFetch";
import { RockItPlaylistResponse } from "@/responses/rockItPlaylistResponse";

export class PlaylistManager {
    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    async getSpotifyPlaylistAsync(publicId: string) {
        const response = await apiFetch(`/spotify/playlist/${publicId}`, {
            auth: false,
        });
        if (!response?.ok) {
            throw "Error fetching playlist.";
        }

        const responseJson = await response.json();

        return RockItPlaylistResponse.parse(responseJson);
    }
    // #endregion
}
