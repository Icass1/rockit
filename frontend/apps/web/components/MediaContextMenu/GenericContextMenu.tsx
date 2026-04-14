import { isSearchResult } from "@rockit/packages/shared";
import { Play } from "lucide-react";
import { TMedia } from "@/models/types/media";
import ContextMenuOption from "@/components/ContextMenu/Option";

export default function GenericContextMenuContent({
    media,
}: {
    media: TMedia;
}) {
    if (isSearchResult(media)) return;
    return (
        <>
            <ContextMenuOption onClick={() => console.log(media.publicId)}>
                <Play />
                Play
            </ContextMenuOption>
        </>
    );
}
