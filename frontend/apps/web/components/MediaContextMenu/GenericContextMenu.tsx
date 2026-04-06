import { Play } from "lucide-react";
import { TMedia } from "@/models/types/media";
import ContextMenuOption from "@/components/ContextMenu/Option";

export default function GenericContextMenuContent({
    media,
}: {
    media: TMedia;
}) {
    return (
        <>
            <ContextMenuOption onClick={() => console.log(media.publicId)}>
                <Play />
                Play
            </ContextMenuOption>
        </>
    );
}
