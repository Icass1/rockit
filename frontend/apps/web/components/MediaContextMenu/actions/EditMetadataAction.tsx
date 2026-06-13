"use client";

import type { JSX } from "react";
import { Pencil } from "lucide-react";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

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
