import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { Send } from "lucide-react";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";

export default function ShareAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const { sharingManager } = useRuntimeServices();
    return (
        <ContextMenuOption
            onClick={() => {
                if (!isSearchResult(media))
                    sharingManager.compose(media.publicId);
            }}
        >
            <Send size={16} />
            {vocabulary.FRIENDS_SHARE}
        </ContextMenuOption>
    );
}
