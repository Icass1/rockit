"use client";

import { ReactNode } from "react";
import { MediaType } from "@/types/media";

// import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";

export default function MediaPopupMenu({
    media,
    children,
}: {
    media: MediaType;
    children: ReactNode;
}) {
    if (media.type == "song") {
        // return <SongPopupMenu song={media}>{children}</SongPopupMenu>;
    } else if (media.type == "video") {
        return <div>TODO</div>;
    }
}
