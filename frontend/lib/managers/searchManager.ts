import { SearchResultsResponse } from "@/dto/searchResponse";
import apiFetch from "@/lib/utils/apiFetch";
import { createAtom } from "@/lib/store";
import { RockItSongWithAlbum } from "../rockit/rockItSongWithAlbum";
import { RockItAlbumWithoutSongs } from "../rockit/rockItAlbumWithoutSongs";
import { RockItArtist } from "../rockit/rockItArtist";
import { RockItPlaylist } from "../rockit/rockItPlaylist";

type SpotifySearchResults = {
    songs: RockItSongWithAlbum[];
    albums: RockItAlbumWithoutSongs[];
    artists: RockItArtist[];
    playlists: RockItPlaylist[];
};

type SearchResults = {
    spotifyResults: SpotifySearchResults;
};

export class SearchManager {
    // #region: Atoms

    private _searchQueryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _searchResultsAtom = createAtom<SearchResults | undefined>();

    // #endregion

    // #region: Methods

    search(query: string) {
        this._searchQueryAtom.set(query);
        this._searchingAtom.set(true);

        apiFetch("/media/search?q=" + encodeURIComponent(query)).then(
            (data) => {
                if (!data?.ok) {
                    console.warn("No response from /search");
                    this._searchingAtom.set(false);
                    return;
                }

                data.json().then((json) => {
                    try {
                        const results = SearchResultsResponse.parse(json);
                        this._searchResultsAtom.set({
                            spotifyResults: {
                                songs: results.spotifyResults.songs.map(
                                    (song) =>
                                        RockItSongWithAlbum.fromResponse(song)
                                ),
                                albums: results.spotifyResults.albums.map(
                                    (album) =>
                                        RockItAlbumWithoutSongs.fromResponse(
                                            album
                                        )
                                ),
                                artists: results.spotifyResults.artists.map(
                                    (artist) =>
                                        RockItArtist.fromResponse(artist)
                                ),
                                playlists: results.spotifyResults.playlists.map(
                                    (playlist) =>
                                        RockItPlaylist.fromResponse(playlist)
                                ),
                            },
                        });
                    } catch (e) {
                        console.error("Error parsing search results", e, json);
                    } finally {
                        this._searchingAtom.set(false);
                    }
                });
            }
        );
    }

    clearResults() {
        this._searchQueryAtom.set("");
        this._searchResultsAtom.set(undefined);
        this._searchingAtom.set(false);
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

    // #endregion
}
