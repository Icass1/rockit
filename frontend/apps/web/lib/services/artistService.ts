import { type ArtistPageResponse, type BaseSongWithAlbumResponse } from "@/dto";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export async function getArtistPageAsync(
    publicId?: string,
    name?: string,
    offset = 0
): Promise<ArtistPageResponse | undefined> {
    const path = publicId
        ? `/media/artist/${encodeURIComponent(publicId)}/page?offset=${offset}`
        : `/media/artists/profile?name=${encodeURIComponent(name ?? "")}&offset=${offset}`;
    return Http.getArtistPage(path);
}

export function playArtistSongs(
    songs: BaseSongWithAlbumResponse[],
    selected?: string
): void {
    const playable = songs.filter((song) => song.downloaded && song.audioUrl);
    if (!playable.length) return;
    rockIt.queueManager.setCurrentList(undefined);
    rockIt.queueManager.setMedia(playable, "");
    rockIt.queueManager.moveToMedia(selected ?? playable[0].publicId);
    rockIt.mediaPlayerManager.play();
}
