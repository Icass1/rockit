"use client";

import type { JSX } from "react";
import { Pencil } from "lucide-react";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";

export default function EditMetadataAction({
    vocabulary,
    onEditMetadata,
}: ActionComponentProps): JSX.Element {
    return (
        <ContextMenuOption onClick={onEditMetadata}>
            <Pencil className="h-5 w-5" />
            {vocabulary.EDIT_METADATA}
        </ContextMenuOption>
    );
}
