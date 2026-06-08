import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { Library } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export function AddToLibraryAction({
    media,
    vocabulary,
    loading,
    setLoading,
}: ActionComponentProps): JSX.Element {
    const addToLibrary = async (): Promise<void> => {
        setLoading(true);
        await rockIt.libraryManager.addMediaToLibrary(media);
        setLoading(false);
    };

    return (
        <ContextMenuOption onClick={addToLibrary} disable={loading}>
            <Library className="h-5 w-5" />
            {vocabulary.ADD_TO_LIBRARY}
        </ContextMenuOption>
    );
}

export function RemoveFromLibraryAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const removeFromLibrary = async (): Promise<void> => {
        if (!isSearchResult(media)) {
            await rockIt.libraryManager.removeMediaFromLibrary(media);
        }
    };

    return (
        <ContextMenuOption onClick={removeFromLibrary}>
            <Library className="h-5 w-5" />
            {vocabulary.REMOVE_FROM_LIBRARY}
        </ContextMenuOption>
    );
}
