

export interface SearchResults {
  songs: SpotifyTrack[]
  albums: SpotifyAlbum[]
}



export interface SpotifyTrack {
  album: SpotifyTrackAlbum
  artists: SpotifyTrackArtist2[]
  available_markets: string[]
  disc_number: number
  duration_ms: number
  explicit: boolean
  external_ids: SpotifyTrackExternalIds
  external_urls: SpotifyTrackExternalUrls4
  href: string
  id: string
  is_playable: boolean
  linked_from: SpotifyTrackLinkedFrom
  restrictions: SpotifyTrackRestrictions2
  name: string
  popularity: number
  preview_url: string
  track_number: number
  type: string
  uri: string
  is_local: boolean
}

export interface SpotifyTrackAlbum {
  album_type: string
  total_tracks: number
  available_markets: string[]
  external_urls: SpotifyTrackExternalUrls
  href: string
  id: string
  images: SpotifyTrackImage[]
  name: string
  release_date: string
  release_date_precision: string
  restrictions: SpotifyTrackRestrictions
  type: string
  uri: string
  artists: SpotifyTrackArtist[]
}

export interface SpotifyTrackExternalUrls {
  spotify: string
}

export interface SpotifyTrackImage {
  url: string
  height: number
  width: number
}

export interface SpotifyTrackRestrictions {
  reason: string
}

export interface SpotifyTrackArtist {
  external_urls: SpotifyTrackExternalUrls2
  href: string
  id: string
  name: string
  type: string
  uri: string
}

export interface SpotifyTrackExternalUrls2 {
  spotify: string
}

export interface SpotifyTrackArtist2 {
  external_urls: SpotifyTrackExternalUrls3
  href: string
  id: string
  name: string
  type: string
  uri: string
}

export interface SpotifyTrackExternalUrls3 {
  spotify: string
}

export interface SpotifyTrackExternalIds {
  isrc: string
  ean: string
  upc: string
}

export interface SpotifyTrackExternalUrls4 {
  spotify: string
}

export interface SpotifyTrackLinkedFrom { }

export interface SpotifyTrackRestrictions2 {
  reason: string
}





export interface SpotifyAlbum {
  album_type: string
  total_tracks: number
  available_markets: string[]
  external_urls: SpotifyAlbumExternalUrls
  href: string
  id: string
  images: SpotifyAlbumImage[]
  name: string
  release_date: string
  release_date_precision: string
  restrictions: SpotifyAlbumRestrictions
  type: string
  uri: string
  artists: SpotifyAlbumArtist[]
}

export interface SpotifyAlbumExternalUrls {
  spotify: string
}

export interface SpotifyAlbumImage {
  url: string
  height: number
  width: number
}

export interface SpotifyAlbumRestrictions {
  reason: string
}

export interface SpotifyAlbumArtist {
  external_urls: SpotifyAlbumExternalUrls2
  href: string
  id: string
  name: string
  type: string
  uri: string
}

export interface SpotifyAlbumExternalUrls2 {
  spotify: string
}








// export interface SearchResults {
//     albums?: (AlbumsEntity)[] | null;
//     playlists?: (PlaylistsEntity)[] | null;
//     songs?: (SongsEntity)[] | null;
// }
// export interface AlbumsEntity {
//     artists?: (ArtistsEntity)[] | null;
//     id: string;
//     image_url: string;
//     name: string;
//     release_date: string;
//     spotify_url: string;
//     total_tracks: number;
//     type: string;
// }
// export interface ArtistsEntity {
//     name: string;
//     type: string;
// }
// export interface PlaylistsEntity {
//     artists?: (ArtistsEntity1)[] | null;
//     id: string;
//     image_url: string;
//     name: string;
//     release_date?: null;
//     spotify_url: string;
//     total_tracks: number;
//     type: string;
// }
// export interface ArtistsEntity1 {
//     name: string;
// }
// export interface SongsEntity {
//     artists?: (ArtistsEntity)[] | null;
//     id: string;
//     image_url: string;
//     name: string;
//     release_date?: null;
//     spotify_url: string;
//     total_tracks?: null;
//     type: string;
// }
