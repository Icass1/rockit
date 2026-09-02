"use client";

import { useEffect, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    ArrowUpDown,
    ClockArrowDown,
    Download,
    Kanban,
    LayoutGrid,
    List,
    LoaderCircle,
    SquareMousePointer,
    Upload,
} from "lucide-react";
import { EContentType } from "@/models/enums/contentType";
import { EFilterMode } from "@/models/enums/filterMode";
import { EViewMode } from "@/models/enums/viewMode";
import { rockIt } from "@/lib/rockit/rockIt";
import { downloadMediaAsZip } from "@/lib/services/downloadZip";
import { cycleEnum } from "@/lib/utils/cycleEnum";
import { LibraryFilters } from "@/components/Library/LibraryFilters";
import { LibraryLists } from "@/components/Library/LibraryLists";
import {
    LibrarySelectionProvider,
    useLibrarySelection,
} from "@/components/Library/LibrarySelectionContext";
import UploadModal from "@/components/Library/UploadModal";

function LibrarySelectionBar(): JSX.Element {
    const { selectionMode, selectedMedia, clearSelection } =
        useLibrarySelection();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [downloading, setDownloading] = useState(false);

    // Packaging runs on the server and can take a while, so the button stays
    // disabled until it finishes instead of queueing another archive.
    const downloadSelection = async (): Promise<void> => {
        if (downloading) return;

        setDownloading(true);
        try {
            await downloadMediaAsZip(selectedMedia, "Library");
        } finally {
            setDownloading(false);
        }
    };

    const downloadButton = (
        <button
            type="button"
            disabled={downloading || selectedMedia.length === 0}
            onClick={(): void => {
                void downloadSelection();
            }}
            className="flex items-center gap-1.5 rounded-md bg-(--color-rockit-pink) px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50"
        >
            {downloading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            {$vocabulary.LIBRARY_ZIP}
        </button>
    );

    const cancelButton = (
        <button
            type="button"
            onClick={clearSelection}
            className="rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
        >
            {$vocabulary.CANCEL}
        </button>
    );

    return (
        <>
            {/* Mobile: in-flow full-width bar (keeps working selection on mobile) */}
            {selectionMode && (
                <div className="mb-3 flex items-center justify-between rounded-lg bg-neutral-800 px-3 py-2 md:hidden">
                    <span className="text-sm font-medium text-white">
                        {selectedMedia.length} {$vocabulary.LIBRARY_SELECTED}
                    </span>
                    <div className="flex items-center gap-2">
                        {downloadButton}
                        {cancelButton}
                    </div>
                </div>
            )}

            {/* Desktop: floating pill docked above the footer */}
            <AnimatePresence>
                {selectionMode && (
                    <motion.div
                        initial={{ y: 24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed inset-x-0 bottom-28 z-40 hidden justify-center px-4 md:left-12 md:flex"
                    >
                        <div className="flex items-center gap-3 rounded-xl bg-neutral-800/95 px-3 py-2 shadow-xl backdrop-blur-md">
                            <span className="pl-1 text-sm font-medium whitespace-nowrap text-white">
                                {selectedMedia.length}{" "}
                                {$vocabulary.LIBRARY_SELECTED}
                            </span>
                            {downloadButton}
                            {cancelButton}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function LibrarySelectionButton(): JSX.Element {
    const { selectionMode, enterSelectionMode } = useLibrarySelection();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (selectionMode) return <></>;

    return (
        <button
            type="button"
            onClick={enterSelectionMode}
            title={$vocabulary.LIBRARY_SELECT_ITEMS}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
            <SquareMousePointer className="h-5 w-5" />
        </button>
    );
}

/**
 * While multi-selecting on desktop, the floating action bar docks above the
 * footer and overhangs the bottom of the scroll area. Bump the scroll
 * container's bottom padding so the last rows/cards aren't hidden behind it.
 */
function SelectionScrollSpacer(): null {
    const { selectionMode } = useLibrarySelection();

    useEffect(() => {
        // Match the app's `md` variant (desktop): width >= 768 AND height >= 500.
        const mobileQuery = window.matchMedia(
            "(max-width: 767px) or (max-height: 499px)"
        );
        const container = document.getElementById("main-scroll-container");
        if (!container) return;

        const desktopSelecting = selectionMode && !mobileQuery.matches;
        // Desktop base clearance is md:pb-24 (96px). The floating bar adds ~64px.
        container.style.paddingBottom = desktopSelecting
            ? "160px"
            : "";
    }, [selectionMode]);

    return null;
}

export default function LibraryClient(): JSX.Element {
    const [filterMode, setFilterMode] = useState<EFilterMode>(
        EFilterMode.DEFAULT
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<EContentType>(
        EContentType.All
    );
    const [viewMode, setViewMode] = useState<EViewMode>(EViewMode.Masonry);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const cycleSortMode = (): void =>
        setFilterMode((m): EFilterMode => cycleEnum(EFilterMode, m));

    return (
        <LibrarySelectionProvider>
            <SelectionScrollSpacer />
            <div className="mx-4 flex flex-col">
                {/* DESKTOP HEADER */}
                <header className="mb-6 hidden items-center gap-3 py-4 md:flex">
                    {/* Left: title + pills */}
                    <div className="mr-4 flex items-center gap-8">
                        <h1 className="ml-2 shrink-0 text-4xl font-bold text-white select-none">
                            {$vocabulary.LIBRARY}
                        </h1>
                        <LibraryFilters
                            activeType={activeType}
                            setActiveType={setActiveType}
                        />
                    </div>

                    {/* Right: sort + view toggle + upload + search */}
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                        <LibrarySelectionButton />
                        {/* Sort */}
                        <button
                            onClick={cycleSortMode}
                            title="Sort"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition select-none hover:text-white"
                        >
                            {filterMode === EFilterMode.DEFAULT && (
                                <ArrowUpDown className="h-5 w-5" />
                            )}
                            {filterMode === EFilterMode.ASC && (
                                <ArrowDownAZ className="h-5 w-5" />
                            )}
                            {filterMode === EFilterMode.DESC && (
                                <ArrowUpAZ className="h-5 w-5" />
                            )}
                            {filterMode === EFilterMode.RECENTLY_ADDED && (
                                <ClockArrowDown className="h-5 w-5" />
                            )}
                        </button>

                        {/* View toggle (Grid → List → Masonry) */}
                        <button
                            onClick={(): void =>
                                setViewMode(
                                    (v): EViewMode => cycleEnum(EViewMode, v)
                                )
                            }
                            title={
                                viewMode === EViewMode.Grid
                                    ? "Grid view"
                                    : viewMode === EViewMode.List
                                      ? "List view"
                                      : "Masonry view"
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition select-none hover:text-white"
                        >
                            {viewMode === EViewMode.Grid ? (
                                <LayoutGrid className="h-5 w-5" />
                            ) : viewMode === EViewMode.List ? (
                                <List className="h-5 w-5" />
                            ) : (
                                <Kanban className="h-5 w-5" />
                            )}
                        </button>

                        {/* Upload */}
                        <button
                            onClick={(): void => setShowUploadModal(true)}
                            title={$vocabulary.UPLOAD}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition select-none hover:text-white"
                        >
                            <Upload className="h-5 w-5" />
                        </button>

                        {/* Search - fixed width that expands on focus */}
                        <div className="relative">
                            <input
                                className="h-8 w-56 rounded-full bg-neutral-900 pr-3 pl-8 text-sm font-medium shadow transition-[width] duration-200 focus:outline-none"
                                style={{
                                    backgroundImage: "url(/search-icon.png)",
                                    backgroundPosition: "10px center",
                                    backgroundSize: "13px",
                                    backgroundRepeat: "no-repeat",
                                }}
                                type="search"
                                placeholder={$vocabulary.SEARCH_LIBRARY}
                                value={searchQuery}
                                onChange={(e): void =>
                                    setSearchQuery(e.target.value)
                                }
                            />
                        </div>
                    </div>
                </header>

                {/* MOBILE HEADER */}
                <header className="mb-4 flex flex-col gap-2 px-4 md:hidden">
                    {/* Row 1: search + upload */}
                    <div className="flex items-center gap-2">
                        <input
                            className="h-9 flex-1 rounded-full bg-neutral-900 pr-3 pl-9 text-sm font-medium shadow focus:outline-none"
                            style={{
                                backgroundImage: "url(/search-icon.png)",
                                backgroundPosition: "12px center",
                                backgroundSize: "14px",
                                backgroundRepeat: "no-repeat",
                            }}
                            type="search"
                            placeholder={$vocabulary.SEARCH_LIBRARY}
                            value={searchQuery}
                            onChange={(e): void =>
                                setSearchQuery(e.target.value)
                            }
                        />
                        <button
                            onClick={(): void => setShowUploadModal(true)}
                            title={$vocabulary.UPLOAD}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 transition select-none hover:bg-neutral-700 hover:text-white"
                        >
                            <Upload className="h-4 w-4" />
                        </button>
                        <LibrarySelectionButton />
                    </div>

                    {/* Row 2: pills */}
                    <LibraryFilters
                        activeType={activeType}
                        setActiveType={setActiveType}
                    />
                </header>

                <LibrarySelectionBar />
                <LibraryLists
                    filterMode={filterMode}
                    searchQuery={searchQuery}
                    activeType={activeType}
                    viewMode={viewMode}
                />

                <UploadModal
                    isOpen={showUploadModal}
                    onClose={(): void => setShowUploadModal(false)}
                />
            </div>
        </LibrarySelectionProvider>
    );
}
