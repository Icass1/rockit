import { ReactNode } from "react";
import { MediaType } from "@/types/media";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import GenericContextMenuContent from "@/components/MediaContextMenu/GenericContextMenu";

export default function MediaContextMenu({
    children,
    media,
}: {
    children: ReactNode;
    media: MediaType;
}) {
    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <GenericContextMenuContent media={media} />
                <ContextMenuOption>Test</ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}
