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
import { LyricsProposalPreview } from "@/components/Lyrics/LyricsProposalPreview";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

type RequestStatus = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";

const statusBadges = (
    vocabulary: import("@rockit/shared").Vocabulary
): Record<string, { bg: string; text: string; label: string }> => ({
    pending: {
        bg: "bg-warning/10",
        text: "text-warning",
        label: vocabulary.PENDING,
    },
    accepted: {
        bg: "bg-success/10",
        text: "text-success-foreground",
        label: vocabulary.ADMIN_STATUS_ACCEPTED,
    },
    rejected: {
        bg: "bg-destructive/10",
        text: "text-destructive-soft",
        label: vocabulary.ADMIN_STATUS_REJECTED,
    },
});

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
    const $vocabulary = useVocabulary();
    const vocabulary = $vocabulary;
    const STATUS_BADGES = statusBadges(vocabulary);
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
        try {
            const result = await Http.reviewRequest(publicId, {
                status,
                reviewComment: null,
            });
            if (result.isOk()) {
                window.dispatchEvent(new Event("lyrics-updated"));
                setError(null);
                setRequests((prev) =>
                    prev.map((r) =>
                        r.publicId === publicId ? { ...r, status } : r
                    )
                );
            } else {
                setError(
                    typeof result.detail === "string"
                        ? result.detail
                        : $vocabulary.EDIT_METADATA_ERROR
                );
            }
        } catch {
            setError($vocabulary.EDIT_METADATA_ERROR);
        } finally {
            setReviewingId(null);
        }
    };

    const filteredRequests =
        filter === "ALL"
            ? requests
            : requests.filter((r) => r.status === filter);

    const statCards = [
        {
            label: vocabulary.UI_TOTAL,
            value: stats?.total ?? 0,
            color: "text-foreground",
            bg: "bg-muted/50",
        },
        {
            label: vocabulary.PENDING,
            value: stats?.pending ?? 0,
            color: "text-warning",
            bg: "bg-warning/5",
        },
        {
            label: vocabulary.ADMIN_STATUS_ACCEPTED,
            value: stats?.accepted ?? 0,
            color: "text-success-foreground",
            bg: "bg-success/5",
        },
        {
            label: vocabulary.ADMIN_STATUS_REJECTED,
            value: stats?.rejected ?? 0,
            color: "text-destructive-soft",
            bg: "bg-destructive/5",
        },
    ];

    const filters: { id: RequestStatus; label: string }[] = [
        { id: "ALL", label: vocabulary.NOTIFICATIONS_ALL },
        { id: "PENDING", label: vocabulary.PENDING },
        { id: "ACCEPTED", label: vocabulary.ADMIN_STATUS_ACCEPTED },
        { id: "REJECTED", label: vocabulary.ADMIN_STATUS_REJECTED },
    ];

    if (!isAdmin) {
        return (
            <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                <p className="text-destructive-soft">
                    {$vocabulary.ADMIN_REQUIRED}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-primary-foreground hover:bg-brand-mid mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition"
                >
                    {$vocabulary.RETRY}
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="text-subtle-foreground h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                <p className="text-destructive-soft">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-primary-foreground hover:bg-brand-mid mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition"
                >
                    {$vocabulary.RETRY}
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-foreground-strong text-2xl font-bold">
                    {$vocabulary.ADMIN_REQUESTS_TITLE}
                </h1>
                <p className="text-subtle-foreground mt-1 text-sm">
                    {$vocabulary.ADMIN_SUGGESTIONS_DESCRIPTION}
                </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className={`border-border-subtle rounded-xl border ${stat.bg} p-4`}
                    >
                        <p className="text-subtle-foreground text-xs font-medium tracking-wider uppercase">
                            {stat.label}
                        </p>
                        <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mb-6 flex items-center gap-2 overflow-x-auto">
                <Filter className="text-subtle-foreground h-4 w-4" />
                {filters.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            filter === f.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground-strong"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {filteredRequests.length === 0 ? (
                <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                    <MessageSquare className="text-disabled-foreground mb-4 h-12 w-12" />
                    <p className="text-subtle-foreground">
                        {$vocabulary.ADMIN_REQUESTS_EMPTY}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map((req) => {
                        const badge =
                            STATUS_BADGES[req.status.toLowerCase()] ||
                            STATUS_BADGES.pending;
                        const typeIcon =
                            REQUEST_TYPE_ICONS[req.requestType.toLowerCase()] ||
                            "📌";
                        const isPending = req.status === "PENDING";

                        return (
                            <div
                                key={req.publicId}
                                className="border-border-subtle bg-secondary hover:border-border rounded-xl border p-5 transition"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="text-lg">
                                                {typeIcon}
                                            </span>
                                            <span className="bg-muted text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                                                {req.requestType}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>

                                        <div className="mb-3 space-y-2">
                                            <div className="bg-muted/50 rounded-lg p-3">
                                                <p className="text-subtle-foreground text-xs font-medium tracking-wider uppercase">
                                                    {
                                                        $vocabulary.ADMIN_PROPOSED_CHANGE
                                                    }
                                                </p>
                                                {req.requestType === "LYRICS" &&
                                                req.mediaPublicId ? (
                                                    <LyricsProposalPreview
                                                        mediaPublicId={
                                                            req.mediaPublicId
                                                        }
                                                        payload={
                                                            req.proposedValue
                                                        }
                                                    />
                                                ) : (
                                                    <p className="text-foreground-strong mt-1 text-sm">
                                                        {req.proposedValue}
                                                    </p>
                                                )}
                                            </div>

                                            {req.comment && (
                                                <div className="bg-muted/30 rounded-lg p-3">
                                                    <p className="text-subtle-foreground text-xs font-medium tracking-wider uppercase">
                                                        {
                                                            $vocabulary.ADMIN_USER_COMMENT
                                                        }
                                                    </p>
                                                    <p className="text-foreground mt-1 text-sm">
                                                        {req.comment}
                                                    </p>
                                                </div>
                                            )}

                                            {req.reviewComment && (
                                                <div className="bg-muted/30 rounded-lg p-3">
                                                    <p className="text-subtle-foreground text-xs font-medium tracking-wider uppercase">
                                                        {
                                                            $vocabulary.ADMIN_REVIEW_NOTE
                                                        }
                                                    </p>
                                                    <p className="text-foreground mt-1 text-sm">
                                                        {req.reviewComment}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-disabled-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                            <span className="flex items-center gap-1">
                                                <Search className="h-3 w-3" />
                                                {req.userName ||
                                                    vocabulary.UNKNOWN_USER}
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
                                                className="bg-success/10 text-success-foreground hover:bg-success/20 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50"
                                            >
                                                {reviewingId ===
                                                req.publicId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ThumbsUp className="h-4 w-4" />
                                                )}
                                                {$vocabulary.ADMIN_ACCEPT}
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
                                                className="bg-destructive/10 text-destructive-soft hover:bg-destructive/20 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50"
                                            >
                                                {reviewingId ===
                                                req.publicId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="h-4 w-4" />
                                                )}
                                                {$vocabulary.ADMIN_REJECT}
                                            </button>
                                        </div>
                                    )}

                                    {!isPending && (
                                        <div className="flex shrink-0 items-center">
                                            {req.status === "ACCEPTED" ? (
                                                <CheckCircle2 className="text-success h-8 w-8" />
                                            ) : (
                                                <XCircle className="text-destructive h-8 w-8" />
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
