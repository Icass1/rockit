"use client";

import { useState, type JSX } from "react";
import { DownloadGroupResponse } from "@/dto";
import { ChevronDown, Library, LoaderCircle, Trash2 } from "lucide-react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadCoverCard from "@/components/Downloader/DownloadCoverCard";
import FadeInOnView from "@/components/Downloader/FadeInOnView";

const VISIBLE_LIMIT = 12;

export default function DownloadGroupSection({
    group,
    onClear,
}: {
    group: DownloadGroupResponse;
    onClear?: () => void;
}): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const saveGroup = async (): Promise<void> => {
        if (!group.sourcePublicId || saving) return;
        setSaving(true);
        try {
            await rockIt.downloaderManager.addGroupToLibraryAsync(
                group.sourcePublicId
            );
            setSaved(true);
        } catch (error) {
            rockIt.notificationManager.notifyError(
                error instanceof Error ? error.message : vocabulary.ERROR
            );
        } finally {
            setSaving(false);
        }
    };
    const [expanded, setExpanded] = useState(false);
    const visibleItems = expanded
        ? group.items
        : group.items.slice(0, VISIBLE_LIMIT);

    return (
        <section>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-white">{group.name}</h2>
                    <p className="text-xs text-neutral-400">
                        {group.items.length} elementos ·{" "}
                        {new Date(group.dateStarted).toLocaleDateString()}
                    </p>
                </div>
                {group.sourcePublicId && (
                    <button
                        disabled={saving || saved}
                        onClick={() => void saveGroup()}
                        className="flex items-center gap-2 text-sm text-neutral-300 disabled:opacity-50"
                        aria-busy={saving}
                    >
                        {saving ? (
                            <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                            <Library size={16} />
                        )}
                        {saved
                            ? vocabulary.ADDED_TO_LIBRARY
                            : vocabulary.ADD_TO_LIBRARY}
                    </button>
                )}
                {onClear && (
                    <button
                        onClick={onClear}
                        className="text-neutral-400 hover:text-red-500"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
                {visibleItems.map((item, i) => (
                    <FadeInOnView key={item.publicId} delay={(i % 12) * 40}>
                        <DownloadCoverCard item={item} />
                    </FadeInOnView>
                ))}
            </div>

            {group.items.length > VISIBLE_LIMIT && (
                <button
                    onClick={(): void => setExpanded(!expanded)}
                    className="mt-3 flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
                >
                    <ChevronDown
                        size={14}
                        className={expanded ? "rotate-180" : ""}
                    />
                    {expanded
                        ? "Ver menos"
                        : `Ver ${group.items.length - VISIBLE_LIMIT} más`}
                </button>
            )}
        </section>
    );
}
