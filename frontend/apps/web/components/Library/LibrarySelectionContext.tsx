"use client";

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type JSX,
    type ReactNode,
} from "react";
import { isDownloadable, isList, isSearchResult } from "@rockit/shared";
import type { TMediaWithSearch } from "@/models/types/media";

interface LibrarySelectionContextValue {
    selectionMode: boolean;
    selectedMedia: TMediaWithSearch[];
    isSelected: (publicId: string) => boolean;
    toggleSelection: (media: TMediaWithSearch) => void;
    enterSelectionMode: () => void;
    clearSelection: () => void;
}

const LibrarySelectionContext = createContext<
    LibrarySelectionContextValue | undefined
>(undefined);

/**
 * Songs, videos, albums and playlists are the only types that resolve to files
 * the backend can put inside a ZIP. Radio stations and artists have nothing
 * downloadable behind them, so they must not be selectable.
 */
export function isZippable(media: TMediaWithSearch): boolean {
    if (isSearchResult(media)) return false;
    return isDownloadable(media) || isList(media);
}

function getPublicId(media: TMediaWithSearch): string | undefined {
    return "publicId" in media ? media.publicId : undefined;
}

export function LibrarySelectionProvider({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<TMediaWithSearch[]>([]);

    const value = useMemo<LibrarySelectionContextValue>(
        () => ({
            selectionMode,
            selectedMedia,
            isSelected: (publicId: string): boolean =>
                selectedMedia.some((media) => getPublicId(media) === publicId),
            toggleSelection: (media: TMediaWithSearch): void => {
                const publicId = getPublicId(media);
                if (!publicId || !isZippable(media)) return;
                setSelectedMedia((current) =>
                    current.some((item) => getPublicId(item) === publicId)
                        ? current.filter(
                              (item) => getPublicId(item) !== publicId
                          )
                        : [...current, media]
                );
            },
            enterSelectionMode: (): void => setSelectionMode(true),
            clearSelection: (): void => {
                setSelectedMedia([]);
                setSelectionMode(false);
            },
        }),
        [selectionMode, selectedMedia]
    );

    return (
        <LibrarySelectionContext.Provider value={value}>
            {children}
        </LibrarySelectionContext.Provider>
    );
}

export function useLibrarySelection(): LibrarySelectionContextValue {
    const context = useContext(LibrarySelectionContext);
    if (!context) {
        throw new Error(
            "useLibrarySelection must be used inside LibrarySelectionProvider"
        );
    }
    return context;
}
