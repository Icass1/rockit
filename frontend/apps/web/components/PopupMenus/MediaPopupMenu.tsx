"use client";

import { ReactNode } from "react";
import { isSong, isVideo, TPlayableMedia } from "@/models/types/media";

// import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";

export default function MediaPopupMenu({
    media,
    children,
}: {
    media: TPlayableMedia;
    children?: ReactNode;
}) {
    if (isSong(media)) {
        // return <SongPopupMenu song={media}>{children}</SongPopupMenu>;
    } else if (isVideo(media)) {
        // return <VideoPopupMenu song={media}>{children}</VideoPopupMenu>;
    }
    return <>{children}</>;
}
