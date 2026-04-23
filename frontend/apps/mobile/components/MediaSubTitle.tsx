import { isSong, TMedia } from "@/shared/index";

export default function MediaSubTitle({ media }: { media: TMedia }) {
    if (isSong(media)) {
        return (
            <>
                {media.artists?.map((a: { name: string }) => a.name).join(", ")}
            </>
        );
    } else {
        console.warn(
            "MediaSubTitle: No implementation for media type",
            media.type
        );
        return null;
    }
}
