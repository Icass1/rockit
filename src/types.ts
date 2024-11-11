export interface SearchResults {
    albums?: (AlbumsEntity)[] | null;
    playlists?: (PlaylistsEntity)[] | null;
    songs?: (SongsEntity)[] | null;
}
export interface AlbumsEntity {
    artists?: (ArtistsEntity)[] | null;
    id: string;
    image_url: string;
    name: string;
    release_date: string;
    spotify_url: string;
    total_tracks: number;
    type: string;
}
export interface ArtistsEntity {
    name: string;
    type: string;
}
export interface PlaylistsEntity {
    artists?: (ArtistsEntity1)[] | null;
    id: string;
    image_url: string;
    name: string;
    release_date?: null;
    spotify_url: string;
    total_tracks: number;
    type: string;
}
export interface ArtistsEntity1 {
    name: string;
}
export interface SongsEntity {
    artists?: (ArtistsEntity)[] | null;
    id: string;
    image_url: string;
    name: string;
    release_date?: null;
    spotify_url: string;
    total_tracks?: null;
    type: string;
}
