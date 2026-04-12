"use client";

import { ReactNode } from "react";
import { TPlayableMedia } from "@/models/types/media";

// import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";

export default function MediaPopupMenu({
    media,
    children,
}: {
    media: TPlayableMedia;
    children?: ReactNode;
}) {
    if (media.type == "song") {
        // return <SongPopupMenu song={media}>{children}</SongPopupMenu>;
    } else if (media.type == "video") {
        return <div>MediaPopupMenu TODO</div>;
    }
    return <>{children}</>;
}
