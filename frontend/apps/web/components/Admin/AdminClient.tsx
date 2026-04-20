"use client";

import { useRef, useState } from "react";
import {
    AllBuildsResponseSchema,
    BuildResponse,
    CompleteChunkedUploadRequestSchema,
    StartChunkedUploadRequestSchema,
    StartChunkedUploadResponseSchema,
    UploadApkResponseSchema,
    UploadChunkRequestSchema,
    UploadChunkResponseSchema,
} from "@/dto";
import { useStore } from "@nanostores/react";
import {
    Download,
    Loader2,
    Package,
    Plus,
    Settings,
    Smartphone,
    Trash2,
    Upload,
    Users,
    X,
} from "lucide-react";
import { EAdminClientTab } from "@/models/enums/adminClientTab";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch, apiPostFetch } from "@/lib/utils/apiFetch";

interface AdminClientProps {
    builds: BuildResponse[];
}

export default function AdminClient({
    builds: initialBuilds,
}: AdminClientProps) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [builds, setBuilds] = useState<BuildResponse[]>(initialBuilds);
    const [activeTab, setActiveTab] = useState<EAdminClientTab>(
        EAdminClientTab.BUILDS
    );

    const [showForm, setShowForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [version, setVersion] = useState("");
    const [description, setDescription] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshBuilds = async () => {
        const result = await apiFetch("/admin/builds", AllBuildsResponseSchema);
        if (result.isOk()) {
            setBuilds(result.result.builds);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith(".apk")) {
            setSelectedFile(file);
            setError(null);
        } else if (file) {
            setError($vocabulary.ADMIN_ONLY_APK);
            setSelectedFile(null);
        }
    };

    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentChunk, setCurrentChunk] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setError($vocabulary.ADMIN_SELECT_APK);
            return;
        }
        if (!version.trim()) {
            setError($vocabulary.ADMIN_ENTER_VERSION);
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);
        setUploadProgress(0);
        setCurrentChunk(0);

        const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
        const fileSize = selectedFile.size;
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

        const startResult = await apiPostFetch(
            "/admin/builds/upload/start",
            StartChunkedUploadRequestSchema,
            StartChunkedUploadResponseSchema,
            {
                fileName: selectedFile.name,
                totalSize: fileSize,
                version,
                description: description || null,
            }
        );

        if (!startResult.isOk()) {
            const errMsg =
                typeof startResult.detail === "string"
                    ? startResult.detail
                    : $vocabulary.ADMIN_UPLOAD_FAILED;
            setError(errMsg);
            setUploading(false);
            return;
        }

        const uploadId = startResult.result.uploadId;

        const fileReader = new FileReader();
        const blob = selectedFile.slice(0, fileSize);

        fileReader.onload = async () => {
            const base64 = (fileReader.result as string).split(",")[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                setCurrentChunk(chunkIndex);

                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, fileSize);
                const chunk = bytes.slice(start, end);

                let binary = "";
                const chunkLen = chunk.length;
                for (let i = 0; i < chunkLen; i++) {
                    binary += String.fromCharCode(chunk[i]);
                }
                const chunkBase64 = btoa(binary);

                const chunkResult = await apiPostFetch(
                    "/admin/builds/upload/chunk",
                    UploadChunkRequestSchema,
                    UploadChunkResponseSchema,
                    {
                        uploadId,
                        chunkIndex,
                        chunkData: chunkBase64,
                        chunkSize: chunk.length,
                        totalChunks,
                    }
                );

                if (chunkResult.isNotOk()) {
                    const errMsg =
                        typeof chunkResult.detail === "string"
                            ? chunkResult.detail
                            : $vocabulary.ADMIN_UPLOAD_FAILED;
                    setError(errMsg);
                    setUploading(false);
                    return;
                }

                const progress = Math.round(
                    ((chunkIndex + 1) / totalChunks) * 100
                );
                setUploadProgress(progress);
            }

            const completeResult = await apiPostFetch(
                "/admin/builds/upload/complete",
                CompleteChunkedUploadRequestSchema,
                UploadApkResponseSchema,
                { uploadId }
            );

            if (completeResult.isNotOk()) {
                const errMsg =
                    typeof completeResult.detail === "string"
                        ? completeResult.detail
                        : $vocabulary.ADMIN_UPLOAD_FAILED;
                setError(errMsg);
                setUploading(false);
                return;
            }

            setSuccess($vocabulary.ADMIN_UPLOAD_SUCCESS);
            await refreshBuilds();

            setVersion("");
            setDescription("");
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setShowForm(false);
            setUploading(false);
            setUploadProgress(0);
            setCurrentChunk(0);
        };

        fileReader.onerror = () => {
            setError($vocabulary.ADMIN_READ_FAILED);
            setUploading(false);
        };

        fileReader.readAsDataURL(blob);
    };

    const tabs = [
        {
            id: EAdminClientTab.BUILDS,
            label: $vocabulary.ADMIN_TAB_BUILDS,
            icon: Smartphone,
        },
        {
            id: EAdminClientTab.USERS,
            label: $vocabulary.ADMIN_TAB_USERS,
            icon: Users,
        },
        {
            id: EAdminClientTab.SETTINGS,
            label: $vocabulary.ADMIN_TAB_SETTINGS,
            icon: Settings,
        },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-neutral-950">
            <div className="border-b border-neutral-800 bg-neutral-900/50">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="flex items-center gap-1 overflow-x-auto py-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? "bg-[#ee1086] text-white"
                                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl p-6">
                {activeTab === EAdminClientTab.BUILDS && (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {$vocabulary.ADMIN_BUILDS_TITLE}
                                </h1>
                                <p className="mt-1 text-sm text-neutral-500">
                                    {$vocabulary.ADMIN_BUILDS_SUBTITLE}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowForm((v) => !v)}
                                className="flex items-center gap-2 rounded-lg bg-[#ee1086] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f53a76] disabled:opacity-50"
                            >
                                {showForm ? (
                                    <>
                                        <X className="h-4 w-4" />{" "}
                                        {$vocabulary.ADMIN_CANCEL}
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />{" "}
                                        {$vocabulary.ADMIN_ADD_BUILD}
                                    </>
                                )}
                            </button>
                        </div>

                        {showForm && (
                            <form
                                onSubmit={handleSubmit}
                                className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
                            >
                                <h2 className="mb-5 text-lg font-semibold text-white">
                                    {$vocabulary.ADMIN_UPLOAD_NEW_BUILD}
                                </h2>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-neutral-300">
                                            {$vocabulary.ADMIN_VERSION}{" "}
                                            <span className="text-neutral-500">
                                                ({$vocabulary.ADMIN_REQUIRED})
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1.2.0"
                                            value={version}
                                            onChange={(e) =>
                                                setVersion(e.target.value)
                                            }
                                            required
                                            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 transition outline-none focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086]"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-neutral-300">
                                            {$vocabulary.ADMIN_APK_FILE}{" "}
                                            <span className="text-neutral-500">
                                                ({$vocabulary.ADMIN_REQUIRED})
                                            </span>
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".apk"
                                            onChange={handleFileSelect}
                                            required
                                            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white file:mr-4 file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1 file:text-sm file:text-white"
                                        />
                                        {selectedFile && (
                                            <p className="mt-1 text-xs text-emerald-400">
                                                {$vocabulary.ADMIN_SELECTED}:{" "}
                                                {selectedFile.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 sm:col-span-2">
                                        <label className="text-sm font-medium text-neutral-300">
                                            {$vocabulary.ADMIN_DESCRIPTION}{" "}
                                            <span className="text-neutral-500">
                                                ({$vocabulary.ADMIN_OPTIONAL})
                                            </span>
                                        </label>
                                        <textarea
                                            placeholder={
                                                $vocabulary.ADMIN_DESCRIPTION_PLACEHOLDER
                                            }
                                            value={description}
                                            onChange={(e) =>
                                                setDescription(e.target.value)
                                            }
                                            rows={3}
                                            className="resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 transition outline-none focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086]"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="mt-4 text-sm text-red-400">
                                        {error}
                                    </p>
                                )}
                                {success && (
                                    <p className="mt-4 text-sm text-emerald-400">
                                        {success}
                                    </p>
                                )}

                                {uploading && (
                                    <div className="mt-4">
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="text-neutral-400">
                                                {uploadProgress}% (
                                                {currentChunk + 1}/
                                                {Math.ceil(
                                                    selectedFile!.size /
                                                        (1024 * 1024)
                                                )}{" "}
                                                chunks)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-neutral-800">
                                            <div
                                                className="h-2 rounded-full bg-[#ee1086] transition-all duration-300"
                                                style={{
                                                    width: `${uploadProgress}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="mt-5 flex items-center gap-2 rounded-lg bg-[#ee1086] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f53a76] disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                            {$vocabulary.ADMIN_UPLOADING}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />{" "}
                                            {$vocabulary.ADMIN_UPLOAD_BUILD}
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {builds.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                                <Package className="mb-4 h-12 w-12 text-neutral-600" />
                                <p className="text-neutral-500">
                                    {$vocabulary.ADMIN_NO_BUILDS}
                                </p>
                                <p className="mt-1 text-sm text-neutral-600">
                                    {$vocabulary.ADMIN_UPLOAD_FIRST}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {builds.map((build, i) => (
                                    <div
                                        key={build.id}
                                        className="group relative rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex flex-1 items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ee1086]/10">
                                                    <Smartphone className="h-6 w-6 text-[#ee1086]" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="rounded-full bg-[#ee1086]/15 px-3 py-0.5 text-sm font-bold text-[#ee1086]">
                                                            v{build.version}
                                                        </span>
                                                        {i === 0 && (
                                                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                                                {
                                                                    $vocabulary.ADMIN_LATEST
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    {build.description && (
                                                        <p className="mt-2 line-clamp-2 max-w-xl text-sm text-neutral-400">
                                                            {build.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                                                        <span className="font-mono">
                                                            {build.apkFilename}
                                                        </span>
                                                        <span>
                                                            {new Date(
                                                                build.dateAdded
                                                            ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                                                    <Download className="h-4 w-4" />
                                                    <span>
                                                        {build.downloads}
                                                    </span>
                                                </div>
                                                <button className="rounded-lg p-2 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-800 hover:text-red-400">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === EAdminClientTab.USERS && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-white">
                                {$vocabulary.ADMIN_USERS_TITLE}
                            </h1>
                            <p className="mt-1 text-sm text-neutral-500">
                                {$vocabulary.ADMIN_USERS_SUBTITLE}
                            </p>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                            <Users className="mb-4 h-12 w-12 text-neutral-600" />
                            <p className="text-neutral-500">
                                {$vocabulary.ADMIN_USERS_COMING_SOON}
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === EAdminClientTab.SETTINGS && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-white">
                                {$vocabulary.ADMIN_SETTINGS_TITLE}
                            </h1>
                            <p className="mt-1 text-sm text-neutral-500">
                                {$vocabulary.ADMIN_SETTINGS_SUBTITLE}
                            </p>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                            <Settings className="mb-4 h-12 w-12 text-neutral-600" />
                            <p className="text-neutral-500">
                                {$vocabulary.ADMIN_SETTINGS_COMING_SOON}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
