import { getMediaAlbum, type TPlayableMedia } from "@/models/types/media";

/** Keep the physical disc when navigating within the same recording/artwork. */
export function shouldKeepVinyl(
    previous: TPlayableMedia,
    next: TPlayableMedia
): boolean {
    if (previous.publicId === next.publicId) return true;
    if (previous.imageUrl && previous.imageUrl === next.imageUrl) return true;
    const albumId = getMediaAlbum(previous)?.publicId;
    return !!albumId && albumId === getMediaAlbum(next)?.publicId;
}
