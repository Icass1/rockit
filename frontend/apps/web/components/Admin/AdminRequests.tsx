"use client";

import { JSX, useEffect, useState } from "react";
import {
    type AdminRequestStatsResponse,
    type UserRequestResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import {
    CheckCircle2,
    ExternalLink,
    Filter,
    Loader2,
    MessageSquare,
    Search,
    ThumbsUp,
    XCircle,
} from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

type RequestStatus = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";

const STATUS_BADGES: Record<
    string,
    { bg: string; text: string; label: string }
> = {
    pending: {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        label: "Pending",
    },
    accepted: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        label: "Accepted",
    },
    rejected: { bg: "bg-red-500/10", text: "text-red-400", label: "Rejected" },
};

const REQUEST_TYPE_ICONS: Record<string, string> = {
    lyrics: "🎵",
    title: "📝",
    artist: "🎤",
    album: "💿",
    genre: "🎸",
    metadata: "📋",
    cover_art: "🖼️",
    other: "📌",
};

export default function AdminRequests(): JSX.Element {
    const [requests, setRequests] = useState<UserRequestResponse[]>([]);
    const [stats, setStats] = useState<AdminRequestStatsResponse | null>(null);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const isAdmin = useStore(rockIt.userManager.admin);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<RequestStatus>("ALL");
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;

        const fetchData = async (): Promise<void> => {
            const [requestsResult, statsResult] = await Promise.all([
                Http.getAllRequests({ status: null, limit: 50, offset: 0 }),
                Http.getRequestStats(),
            ]);

            if (cancelled) return;

            if (requestsResult.isOk()) {
                setRequests(requestsResult.result.requests);
            } else {
                setError(
                    typeof requestsResult.detail === "string"
                        ? requestsResult.detail
                        : "Failed to load requests"
                );
            }

            if (statsResult.isOk()) {
                setStats(statsResult.result);
            }

            setLoading(false);
        };

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [isAdmin, $vocabulary]);

    const handleReview = async (
        publicId: string,
        status: "ACCEPTED" | "REJECTED"
    ): Promise<void> => {
        setReviewingId(publicId);
        const result = await Http.reviewRequest(publicId, {
            status,
            reviewComment: null,
        });
        if (result.isOk()) {
            setRequests((prev) =>
                prev.map((r) =>
                    r.publicId === publicId ? { ...r, status } : r
                )
            );
        }
        setReviewingId(null);
    };

    const filteredRequests =
        filter === "ALL"
            ? requests
            : requests.filter((r) => r.status === filter);

    const statCards = [
        {
            label: "Total",
            value: stats?.total ?? 0,
            color: "text-neutral-300",
            bg: "bg-neutral-800/50",
        },
        {
            label: "Pending",
            value: stats?.pending ?? 0,
            color: "text-amber-400",
            bg: "bg-amber-500/5",
        },
        {
            label: "Accepted",
            value: stats?.accepted ?? 0,
            color: "text-emerald-400",
            bg: "bg-emerald-500/5",
        },
        {
            label: "Rejected",
            value: stats?.rejected ?? 0,
            color: "text-red-400",
            bg: "bg-red-500/5",
        },
    ];

    const filters: { id: RequestStatus; label: string }[] = [
        { id: "ALL", label: "All" },
        { id: "PENDING", label: "Pending" },
        { id: "ACCEPTED", label: "Accepted" },
        { id: "REJECTED", label: "Rejected" },
    ];

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                <p className="text-red-400">{$vocabulary.ADMIN_REQUIRED}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-(--color-rockit-pink) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--color-rockit-pink-mid)"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-(--color-rockit-pink) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--color-rockit-pink-mid)"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">
                    {$vocabulary.ADMIN_REQUESTS_TITLE}
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                    Manage user suggestions for lyrics, metadata, and content
                    corrections
                </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className={`rounded-xl border border-neutral-800 ${stat.bg} p-4`}
                    >
                        <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
                            {stat.label}
                        </p>
                        <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mb-6 flex items-center gap-2 overflow-x-auto">
                <Filter className="h-4 w-4 text-neutral-500" />
                {filters.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            filter === f.id
                                ? "bg-(--color-rockit-pink) text-white"
                                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                    <MessageSquare className="mb-4 h-12 w-12 text-neutral-600" />
                    <p className="text-neutral-500">No requests found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map((req) => {
                        const badge =
                            STATUS_BADGES[req.status] || STATUS_BADGES.pending;
                        const typeIcon =
                            REQUEST_TYPE_ICONS[req.requestType] || "📌";
                        const isPending = req.status === "PENDING";

                        return (
                            <div
                                key={req.publicId}
                                className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="text-lg">
                                                {typeIcon}
                                            </span>
                                            <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-300 capitalize">
                                                {req.requestType}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>

                                        <div className="mb-3 space-y-2">
                                            <div className="rounded-lg bg-neutral-800/50 p-3">
                                                <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
                                                    Proposed change
                                                </p>
                                                <p className="mt-1 text-sm text-white">
                                                    {req.proposedValue}
                                                </p>
                                            </div>

                                            {req.comment && (
                                                <div className="rounded-lg bg-neutral-800/30 p-3">
                                                    <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
                                                        User comment
                                                    </p>
                                                    <p className="mt-1 text-sm text-neutral-300">
                                                        {req.comment}
                                                    </p>
                                                </div>
                                            )}

                                            {req.reviewComment && (
                                                <div className="rounded-lg bg-neutral-800/30 p-3">
                                                    <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
                                                        Review note
                                                    </p>
                                                    <p className="mt-1 text-sm text-neutral-300">
                                                        {req.reviewComment}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                                            <span className="flex items-center gap-1">
                                                <Search className="h-3 w-3" />
                                                {req.userName || "Unknown user"}
                                            </span>
                                            {req.mediaPublicId && (
                                                <span className="flex items-center gap-1">
                                                    <ExternalLink className="h-3 w-3" />
                                                    {req.mediaPublicId.substring(
                                                        0,
                                                        12
                                                    )}
                                                    ...
                                                </span>
                                            )}
                                            <span>
                                                {new Date(
                                                    req.dateAdded
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {isPending && (
                                        <div className="flex shrink-0 flex-col gap-2">
                                            <button
                                                onClick={() =>
                                                    handleReview(
                                                        req.publicId,
                                                        "ACCEPTED"
                                                    )
                                                }
                                                disabled={
                                                    reviewingId === req.publicId
                                                }
                                                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                                            >
                                                {reviewingId ===
                                                req.publicId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ThumbsUp className="h-4 w-4" />
                                                )}
                                                Accept
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleReview(
                                                        req.publicId,
                                                        "REJECTED"
                                                    )
                                                }
                                                disabled={
                                                    reviewingId === req.publicId
                                                }
                                                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                                            >
                                                {reviewingId ===
                                                req.publicId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="h-4 w-4" />
                                                )}
                                                Reject
                                            </button>
                                        </div>
                                    )}

                                    {!isPending && (
                                        <div className="flex shrink-0 items-center">
                                            {req.status === "ACCEPTED" ? (
                                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-8 w-8 text-red-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
