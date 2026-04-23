import { isSongWithAlbum, TMedia } from "@/shared/index";

export default function MediaSubSubTitle({ media }: { media: TMedia }) {
    if (isSongWithAlbum(media)) {
        return <>{media.album.name}</>;
    } else {
        console.warn(
            "MediaSubSubTitle: No implementation for media type",
            media.type
        );
        return null;
    }
}
