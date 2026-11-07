"use client";

import { JSX, useRef, useState } from "react";
import { BuildResponse } from "@/dto";
import {
    BarChart3,
    Download,
    Loader2,
    MessageSquare,
    Package,
    Plus,
    Search,
    Settings,
    Smartphone,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import { EAdminClientTab } from "@/models/enums/adminClientTab";
import { Http } from "@/lib/http";
import AdminMediaSearch from "@/components/Admin/AdminMediaSearch";
import AdminRequests from "@/components/Admin/AdminRequests";
import AdminStats from "@/components/Admin/AdminStats";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

interface AdminClientProps {
    builds: BuildResponse[];
}

export default function AdminClient({
    builds: initialBuilds,
}: AdminClientProps): JSX.Element {
    const $vocabulary = useVocabulary();
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

    const refreshBuilds = async (): Promise<void> => {
        const result = await Http.getAllBuilds();
        if (result.isOk()) {
            setBuilds(result.result.builds);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
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

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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

        const startResult = await Http.startChunkedUpload({
            fileName: selectedFile.name,
            totalSize: fileSize,
            version,
            description: description || null,
        });

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

        fileReader.onload = async (): Promise<void> => {
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

                const chunkResult = await Http.uploadChunk({
                    uploadId,
                    chunkIndex,
                    chunkData: chunkBase64,
                    chunkSize: chunk.length,
                    totalChunks,
                });

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

            const completeResult = await Http.completeChunkedUpload({
                uploadId,
            });

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

        fileReader.onerror = (): void => {
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
            id: EAdminClientTab.SEARCH,
            label: $vocabulary.ADMIN_TAB_SEARCH,
            icon: Search,
        },
        {
            id: EAdminClientTab.REQUESTS,
            label: $vocabulary.ADMIN_TAB_REQUESTS,
            icon: MessageSquare,
        },
        {
            id: EAdminClientTab.STATS,
            label: $vocabulary.STATS,
            icon: BarChart3,
        },
        {
            id: EAdminClientTab.SETTINGS,
            label: $vocabulary.ADMIN_TAB_SETTINGS,
            icon: Settings,
        },
    ];

    return (
        <div className="bg-background min-h-[calc(100vh-4rem)]">
            <div className="border-border-subtle bg-secondary/50 border-b">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="flex items-center gap-1 overflow-x-auto py-2">
                        {tabs.map((tab): JSX.Element => (
                            <button
                                key={tab.id}
                                onClick={(): void => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground-strong"
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
                                <h1 className="text-foreground-strong text-2xl font-bold">
                                    {$vocabulary.ADMIN_BUILDS_TITLE}
                                </h1>
                                <p className="text-subtle-foreground mt-1 text-sm">
                                    {$vocabulary.ADMIN_BUILDS_SUBTITLE}
                                </p>
                            </div>
                            <button
                                onClick={(): void =>
                                    setShowForm((v): boolean => !v)
                                }
                                className="bg-primary text-primary-foreground hover:bg-brand-mid flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50"
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
                                className="border-border-subtle bg-secondary mb-8 rounded-xl border p-6"
                            >
                                <h2 className="text-foreground-strong mb-5 text-lg font-semibold">
                                    {$vocabulary.ADMIN_UPLOAD_NEW_BUILD}
                                </h2>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-foreground text-sm font-medium">
                                            {$vocabulary.ADMIN_VERSION}{" "}
                                            <span className="text-subtle-foreground">
                                                ({$vocabulary.ADMIN_REQUIRED})
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1.2.0"
                                            value={version}
                                            onChange={(e): void =>
                                                setVersion(e.target.value)
                                            }
                                            required
                                            className="border-border bg-muted text-foreground-strong placeholder-subtle-foreground focus:border-primary focus:ring-primary rounded-lg border px-4 py-2.5 text-sm transition outline-none focus:ring-1"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-foreground text-sm font-medium">
                                            {$vocabulary.ADMIN_APK_FILE}{" "}
                                            <span className="text-subtle-foreground">
                                                ({$vocabulary.ADMIN_REQUIRED})
                                            </span>
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".apk"
                                            onChange={handleFileSelect}
                                            required
                                            className="border-border bg-muted text-foreground-strong file:bg-accent file:text-foreground-strong rounded-lg border px-4 py-2.5 text-sm file:mr-4 file:rounded file:border-0 file:px-3 file:py-1 file:text-sm"
                                        />
                                        {selectedFile && (
                                            <p className="text-success-foreground mt-1 text-xs">
                                                {$vocabulary.ADMIN_SELECTED}:{" "}
                                                {selectedFile.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 sm:col-span-2">
                                        <label className="text-foreground text-sm font-medium">
                                            {$vocabulary.ADMIN_DESCRIPTION}{" "}
                                            <span className="text-subtle-foreground">
                                                ({$vocabulary.ADMIN_OPTIONAL})
                                            </span>
                                        </label>
                                        <textarea
                                            placeholder={
                                                $vocabulary.ADMIN_DESCRIPTION_PLACEHOLDER
                                            }
                                            value={description}
                                            onChange={(e): void =>
                                                setDescription(e.target.value)
                                            }
                                            rows={3}
                                            className="border-border bg-muted text-foreground-strong placeholder-subtle-foreground focus:border-primary focus:ring-primary resize-none rounded-lg border px-4 py-2.5 text-sm transition outline-none focus:ring-1"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-destructive-soft mt-4 text-sm">
                                        {error}
                                    </p>
                                )}
                                {success && (
                                    <p className="text-success-foreground mt-4 text-sm">
                                        {success}
                                    </p>
                                )}

                                {uploading && (
                                    <div className="mt-4">
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {uploadProgress}% (
                                                {currentChunk + 1}/
                                                {Math.ceil(
                                                    selectedFile!.size /
                                                        (1024 * 1024)
                                                )}{" "}
                                                {
                                                    $vocabulary.ADMIN_UPLOAD_CHUNKS
                                                }
                                                )
                                            </span>
                                        </div>
                                        <div className="bg-muted h-2 w-full rounded-full">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all duration-300"
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
                                    className="bg-primary text-primary-foreground hover:bg-brand-mid mt-5 flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50"
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
                            <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                                <Package className="text-disabled-foreground mb-4 h-12 w-12" />
                                <p className="text-subtle-foreground">
                                    {$vocabulary.ADMIN_NO_BUILDS}
                                </p>
                                <p className="text-disabled-foreground mt-1 text-sm">
                                    {$vocabulary.ADMIN_UPLOAD_FIRST}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {builds.map((build, i): JSX.Element => (
                                    <div
                                        key={build.publicId}
                                        className="group border-border-subtle bg-secondary hover:border-border relative rounded-xl border p-5 transition"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex flex-1 items-center gap-4">
                                                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                                                    <Smartphone className="text-primary h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-primary/15 text-primary rounded-full px-3 py-0.5 text-sm font-bold">
                                                            v{build.version}
                                                        </span>
                                                        {i === 0 && (
                                                            <span className="bg-success/10 text-success-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                                                                {
                                                                    $vocabulary.ADMIN_LATEST
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    {build.description && (
                                                        <p className="text-muted-foreground mt-2 line-clamp-2 max-w-xl text-sm">
                                                            {build.description}
                                                        </p>
                                                    )}
                                                    <div className="text-disabled-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
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
                                                <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                                                    <Download className="h-4 w-4" />
                                                    <span>
                                                        {build.downloads}
                                                    </span>
                                                </div>
                                                <button className="text-subtle-foreground hover:bg-muted hover:text-destructive-soft rounded-lg p-2 opacity-0 transition group-hover:opacity-100">
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

                {activeTab === EAdminClientTab.SEARCH && <AdminMediaSearch />}

                {activeTab === EAdminClientTab.REQUESTS && <AdminRequests />}

                {activeTab === EAdminClientTab.STATS && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-foreground-strong text-2xl font-bold">
                                {$vocabulary.ADMIN_REQUEST_LOG_STATS}
                            </h1>
                            <p className="text-subtle-foreground mt-1 text-sm">
                                {$vocabulary.ADMIN_REQUEST_DESCRIPTION}
                            </p>
                        </div>
                        <AdminStats />
                    </div>
                )}

                {activeTab === EAdminClientTab.SETTINGS && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-foreground-strong text-2xl font-bold">
                                {$vocabulary.ADMIN_SETTINGS_TITLE}
                            </h1>
                            <p className="text-subtle-foreground mt-1 text-sm">
                                {$vocabulary.ADMIN_SETTINGS_SUBTITLE}
                            </p>
                        </div>
                        <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                            <Settings className="text-disabled-foreground mb-4 h-12 w-12" />
                            <p className="text-subtle-foreground">
                                {$vocabulary.ADMIN_SETTINGS_COMING_SOON}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
