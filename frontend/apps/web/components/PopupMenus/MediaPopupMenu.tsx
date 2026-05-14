"use client";

import { JSX, ReactNode } from "react";
import { isSong, isVideo, TPlayableMedia } from "@/models/types/media";

export default function MediaPopupMenu({
    media,
    children,
}: {
    media: TPlayableMedia;
    children?: ReactNode;
}): JSX.Element {
    if (isSong(media)) {
        // return <SongPopupMenu song={media}>{children}</SongPopupMenu>;
    } else if (isVideo(media)) {
        // return <VideoPopupMenu song={media}>{children}</VideoPopupMenu>;
    }
    return <>{children}</>;
}
