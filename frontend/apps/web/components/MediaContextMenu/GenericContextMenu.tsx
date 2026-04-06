import { Play } from "lucide-react";
import { MediaType } from "@/models/types/media";
import ContextMenuOption from "@/components/ContextMenu/Option";

export default function GenericContextMenuContent({
    media,
}: {
    media: MediaType;
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
