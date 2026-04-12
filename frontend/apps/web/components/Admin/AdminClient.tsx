"use client";

import { useState } from "react";
import {
    AddVersionRequestSchema,
    AllBuildsResponseSchema,
    BuildResponse,
    OkResponseSchema,
} from "@/dto";
import { Download, Package, Plus, X } from "lucide-react";
import { apiFetch, apiPostFetch } from "@/lib/utils/apiFetch";

interface AdminClientProps {
    builds: BuildResponse[];
}

export default function AdminClient({
    builds: initialBuilds,
}: AdminClientProps) {
    const [builds, setBuilds] = useState<BuildResponse[]>(initialBuilds);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [version, setVersion] = useState("");
    const [apkFilename, setApkFilename] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const postResult = await apiPostFetch(
            "/admin/builds",
            AddVersionRequestSchema,
            OkResponseSchema,
            { version, apkFilename, description: description || null }
        );

        if (postResult.isNotOk()) {
            setError(
                typeof postResult.detail === "string"
                    ? postResult.detail
                    : "Failed to add build."
            );
            setSubmitting(false);
            return;
        }

        const listResult = await apiFetch(
            "/admin/builds",
            AllBuildsResponseSchema
        );
        if (listResult.isOk()) {
            setBuilds(listResult.result.builds);
        }

        setVersion("");
        setApkFilename("");
        setDescription("");
        setShowForm(false);
        setSubmitting(false);
    };

    return (
        <div className="mx-auto max-w-4xl p-6">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">
                    Android Builds
                </h1>
                <button
                    onClick={() => setShowForm((v) => !v)}
                    className="flex items-center gap-2 rounded-lg bg-[#ee1086] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f53a76]"
                >
                    {showForm ? (
                        <>
                            <X className="h-4 w-4" /> Cancel
                        </>
                    ) : (
                        <>
                            <Plus className="h-4 w-4" /> Add Build
                        </>
                    )}
                </button>
            </div>

            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="mb-8 rounded-xl bg-neutral-800 p-6"
                >
                    <h2 className="mb-4 text-lg font-semibold text-white">
                        New Build
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-neutral-400">
                                Version
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 1.2.0"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                required
                                className="rounded-lg bg-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-[#ee1086]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-neutral-400">
                                APK Filename
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. rockit-1.2.0.apk"
                                value={apkFilename}
                                onChange={(e) => setApkFilename(e.target.value)}
                                required
                                className="rounded-lg bg-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-[#ee1086]"
                            />
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-sm text-neutral-400">
                                Description{" "}
                                <span className="text-neutral-600">
                                    (optional)
                                </span>
                            </label>
                            <textarea
                                placeholder="What changed in this build..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="resize-none rounded-lg bg-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-[#ee1086]"
                            />
                        </div>
                    </div>
                    {error && (
                        <p className="mt-3 text-sm text-red-400">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-4 rounded-lg bg-[#ee1086] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#f53a76] disabled:opacity-50"
                    >
                        {submitting ? "Adding..." : "Add Build"}
                    </button>
                </form>
            )}

            {builds.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-neutral-800 py-16 text-neutral-500">
                    <Package className="mb-3 h-10 w-10" />
                    <p>No builds yet.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {builds.map((build, i) => (
                        <div
                            key={build.id}
                            className="rounded-xl bg-neutral-800 p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="rounded-full bg-[#ee1086]/15 px-3 py-0.5 text-sm font-bold text-[#ee1086]">
                                        v{build.version}
                                    </span>
                                    {i === 0 && (
                                        <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                                            latest
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                                    <Download className="h-3.5 w-3.5" />
                                    {build.downloads}
                                </div>
                            </div>

                            {build.description && (
                                <p className="mt-2 text-sm text-neutral-400">
                                    {build.description}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                                <span>{build.apkFilename}</span>
                                <span>
                                    {new Date(build.dateAdded).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
