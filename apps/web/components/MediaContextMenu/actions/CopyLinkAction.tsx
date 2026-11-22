import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { Link } from "lucide-react";
import { copyPublicMediaLink } from "@/lib/services/publicSharing";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";

export default function CopyLinkAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    return (
        <ContextMenuOption
            onClick={() => {
                if (!isSearchResult(media)) void copyPublicMediaLink(media);
            }}
        >
            <Link size={16} />
            {vocabulary.SHARING_COPY_LINK}
        </ContextMenuOption>
    );
}
