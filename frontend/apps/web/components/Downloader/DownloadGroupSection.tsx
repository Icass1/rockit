"use client";

import { memo, useRef, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DownloadBrowseGroupResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Library,
    LoaderCircle,
    Music,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadCoverCard from "@/components/Downloader/DownloadCoverCard";

function DownloadGroupSection({
    group,
}: {
    group: DownloadBrowseGroupResponse;
}): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const detail = useStore(rockIt.downloaderManager.detailAtom);
    const pending = useStore(rockIt.downloaderManager.groupPendingAtom)[
        group.publicId
    ];
    const expanded = detail?.groupId === group.publicId;
    const confirmation = useRef<HTMLDialogElement>(null);
    const title =
        group.sourceType === "album"
            ? vocabulary.ALBUMS
            : group.sourceType === "playlist"
              ? vocabulary.PLAYLISTS
              : vocabulary.DOWNLOADS;
    const items = expanded ? detail.items : group.items;
    const buttonClass =
        "flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <section
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
            aria-busy={!!pending}
        >
            <div className="flex flex-wrap items-start gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                    {group.imageUrl ? (
                        <Image
                            src={group.imageUrl}
                            alt={group.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                        />
                    ) : (
                        <Music className="m-6 h-8 w-8 text-neutral-500" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-400">
                        {title}
                        {group.provider ? ` · ${group.provider}` : ""}
                    </p>
                    <h2 className="mt-1 truncate font-semibold text-white">
                        {group.sourceUrl ? (
                            <Link
                                href={group.sourceUrl}
                                className="hover:underline"
                            >
                                {group.name}
                            </Link>
                        ) : (
                            group.name
                        )}
                    </h2>
                    <p className="mt-1 text-xs text-neutral-400">
                        {group.total} {vocabulary.SONGS} · {group.success}{" "}
                        {vocabulary.COMPLETED} · {group.fail}{" "}
                        {vocabulary.FAILED}
                    </p>
                    {group.active > 0 && (
                        <p role="status" className="mt-1 text-xs text-pink-400">
                            {vocabulary.DOWNLOADING} · {group.active}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {group.sourcePublicId && (
                        <button
                            className={buttonClass}
                            disabled={!!pending || group.inLibrary}
                            onClick={() =>
                                void rockIt.downloaderManager.runGroupActionAsync(
                                    group,
                                    "library"
                                )
                            }
                        >
                            {pending === "library" ? (
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />
                            ) : (
                                <Library size={14} />
                            )}
                            {group.inLibrary
                                ? vocabulary.ADDED_TO_LIBRARY
                                : vocabulary.ADD_TO_LIBRARY}
                        </button>
                    )}
                    <button
                        className={buttonClass}
                        disabled={!!pending || !group.canManage}
                        onClick={() =>
                            void rockIt.downloaderManager.runGroupActionAsync(
                                group,
                                "retry"
                            )
                        }
                    >
                        {pending === "retry" ? (
                            <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                            <RefreshCw size={14} />
                        )}
                        {vocabulary.REDOWNLOAD}
                    </button>
                    <button
                        className={buttonClass}
                        disabled={!!pending || !group.canManage}
                        onClick={() => confirmation.current?.showModal()}
                    >
                        <Trash2 size={14} />
                        {vocabulary.DELETE}
                    </button>
                    {group.providerUrl && (
                        <a
                            className={buttonClass}
                            href={group.providerUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink size={14} />
                            {group.provider}
                        </a>
                    )}
                </div>
            </div>
            <button
                className="my-4 flex items-center gap-2 text-sm text-neutral-300"
                aria-expanded={expanded}
                aria-controls={`tracks-${group.publicId}`}
                onClick={() =>
                    expanded
                        ? rockIt.downloaderManager.closeGroup()
                        : void rockIt.downloaderManager.openGroupAsync(
                              group.publicId
                          )
                }
            >
                <ChevronDown
                    size={16}
                    className={expanded ? "rotate-180" : ""}
                />
                {expanded
                    ? vocabulary.DOWNLOADER_HIDE_TRACKS
                    : vocabulary.DOWNLOADER_SHOW_TRACKS}
                {group.matching !== group.total ? ` · ${group.matching}` : ""}
            </button>
            <div id={`tracks-${group.publicId}`}>
                {expanded && detail.loading ? (
                    <div
                        role="status"
                        className="flex items-center gap-2 text-sm text-neutral-400"
                    >
                        <LoaderCircle size={20} className="animate-spin" />
                        {vocabulary.DOWNLOADING}
                    </div>
                ) : expanded && detail.error ? (
                    <div role="alert" className="text-red-400">
                        {detail.error}
                        <button
                            className={buttonClass}
                            onClick={() =>
                                void rockIt.downloaderManager.openGroupAsync(
                                    group.publicId,
                                    detail.offset
                                )
                            }
                        >
                            {vocabulary.RETRY}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                        {items.map((item) => (
                            <DownloadCoverCard
                                key={item.publicId}
                                item={item}
                            />
                        ))}
                    </div>
                )}
            </div>
            {expanded && !detail.loading && (
                <div className="mt-4 flex items-center justify-end gap-3 text-xs text-neutral-400">
                    <button
                        className={buttonClass}
                        aria-label={vocabulary.DOWNLOADER_PREVIOUS_PAGE}
                        disabled={detail.offset === 0}
                        onClick={() =>
                            void rockIt.downloaderManager.openGroupAsync(
                                group.publicId,
                                Math.max(0, detail.offset - 48)
                            )
                        }
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span>
                        {vocabulary.DOWNLOADER_PAGE}{" "}
                        {Math.floor(detail.offset / 48) + 1}
                    </span>
                    <button
                        className={buttonClass}
                        aria-label={vocabulary.DOWNLOADER_NEXT_PAGE}
                        disabled={!detail.hasMore}
                        onClick={() =>
                            void rockIt.downloaderManager.openGroupAsync(
                                group.publicId,
                                detail.offset + 48
                            )
                        }
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
            <dialog
                ref={confirmation}
                aria-labelledby={`delete-${group.publicId}`}
                className="m-auto max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-white backdrop:bg-black/70"
            >
                <h3 id={`delete-${group.publicId}`} className="font-semibold">
                    {group.name}
                </h3>
                <p className="my-4 text-sm text-neutral-300">
                    {vocabulary.DOWNLOADER_DELETE_GROUP}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        className={buttonClass}
                        onClick={() => confirmation.current?.close()}
                    >
                        {vocabulary.CANCEL}
                    </button>
                    <button
                        className={buttonClass}
                        onClick={() => {
                            confirmation.current?.close();
                            void rockIt.downloaderManager.runGroupActionAsync(
                                group,
                                "delete"
                            );
                        }}
                    >
                        {vocabulary.DELETE}
                    </button>
                </div>
            </dialog>
        </section>
    );
}
export default memo(DownloadGroupSection);
