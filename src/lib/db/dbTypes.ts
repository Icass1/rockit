// **********************************************
// **** File managed by sqlWrapper by RockIt ****
// ***********^**********************************

export interface ExternalImagesType {
    id: string;
    url: string;
    width: number;
    height: number;
}
export interface InternalImagesType {
    id: string;
    url: string;
    path: string;
}
export interface AlbumsType {
    id: string;
    image_id: string;
    name: string;
    release_date: string;
    popularity?: number;
    disc_count: number;
    date_added: string;
    path: string;
}
export interface AlbumExternalImagesType {
    album_id: string;
    image_id: string;
}
export interface ArtistsType {
    id: string;
    name: string;
    genres?: string;
    followers?: number;
    popularity?: number;
    date_added: string;
    image_id?: string;
}
export interface AlbumArtistsType {
    album_id: string;
    artist_id: string;
}
export interface ArtistExternalImagesType {
    artist_id: string;
    image_id: string;
}
export interface SongsType {
    id: string;
    name: string;
    duration: number;
    track_number: number;
    disc_number: number;
    popularity?: number;
    image_id?: string;
    path?: string;
    album_id: string;
    date_added: string;
    isrc: string;
    download_url?: string;
    lyrics?: string;
    dynamic_lyrics?: string;
}
export interface SongArtistsType {
    song_id: string;
    artist_id: string;
}
export interface UsersType {
    id: string;
    username: string;
    password_hash: string;
    current_song_id?: string;
    current_station?: string;
    current_time?: number;
    queue_index?: number;
    random_queue?: boolean;
    repeat_song?: string;
    volume?: number;
    cross_fade?: number;
    lang?: string;
    admin?: boolean;
    super_admin?: boolean;
    dev_user?: boolean;
    date_added: string;
}
export interface UserListsType {
    user_id: string;
    item_type: string;
    item_id: string;
    date_added: string;
}
export interface UserQueueSongsType {
    user_id: string;
    position: number;
    song_id: string;
    list_type: string;
    list_id: string;
}
export interface UserPinnedListsType {
    user_id: string;
    item_type: string;
    item_id: string;
    date_added: string;
}
export interface UserLikedSongsType {
    user_id: string;
    song_id: string;
    date_added: string;
}
export interface UserHistorySongsType {
    user_id: string;
    song_id: string;
    played_at: string;
}
export interface PlaylistsType {
    id: string;
    image_id: string;
    name: string;
    owner: string;
    followers: number;
    date_added: string;
    updated_at: string;
    path: string;
}
export interface PlaylistExternalImagesType {
    playlist_id: string;
    image_id: string;
}
export interface PlaylistSongsType {
    playlist_id: string;
    song_id: string;
    added_by?: string;
    date_added?: string;
    disabled?: boolean;
}
export interface DownloadsType {
    id: string;
    user_id: string;
    date_started: string;
    date_ended?: string;
    download_url: string;
    status: string;
    seen?: boolean;
    success?: number;
    fail?: number;
}
export interface ErrorsType {
    id: string;
    msg?: string;
    source?: string;
    line_no?: number;
    column_no?: number;
    error_message?: string;
    error_cause?: string;
    error_name?: string;
    error_stack?: string;
    user_id?: string;
    date_added: string;
}