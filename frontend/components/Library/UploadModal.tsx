"use client";

import { useCallback, useRef, useState } from "react";
import { BACKEND_URL } from "@/environment";
import { useStore } from "@nanostores/react";
import { FileArchive, FileAudio, Upload, X } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadFile {
    id: string;
    file: File;
    title: string;
    artist: string;
    album: string;
    year: string;
    track: string;
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// ─── Filename parser ──────────────────────────────────────────────────────────
// Best-effort extraction from patterns like:
//   "01 - Artist - Song Title (2021).mp3"
//   "Artist - Song.mp3"
//   "Song.mp3"

function parseFilename(filename: string): Omit<UploadFile, "id" | "file"> {
    const nameWithoutExt = filename.replace(/\.(mp3|zip|flac|ogg|m4a)$/i, "");

    // Track number: leading digits followed by separator
    const trackMatch = nameWithoutExt.match(/^(\d{1,3})\s*[-._]\s*/);
    let track = "";
    let remaining = nameWithoutExt;
    if (trackMatch) {
        track = String(parseInt(trackMatch[1], 10)); // normalize "01" → "1"
        remaining = nameWithoutExt.slice(trackMatch[0].length);
    }

    // Year: (YYYY) anywhere in name
    const yearMatch = remaining.match(/\((\d{4})\)/);
    let year = "";
    if (yearMatch) {
        year = yearMatch[1];
        remaining = remaining.replace(yearMatch[0], "").trim();
    }

    // Artist - Title split (first dash is the separator)
    const parts = remaining.split(/\s*[-–—]\s*/);
    let artist = "";
    let title = remaining.trim();
    const album = "";

    if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    }

    return { title, artist, album, year, track };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const dragCounter = useRef(0); // track nested dragenter/dragleave properly

    const addFiles = useCallback((fileList: FileList | File[]) => {
        const accepted = Array.from(fileList).filter((f) =>
            /\.(mp3|zip|flac|ogg|m4a)$/i.test(f.name)
        );
        const parsed: UploadFile[] = accepted.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            ...parseFilename(file.name),
        }));
        setFiles((prev) => [...prev, ...parsed]);
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current++;
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            dragCounter.current = 0;
            setIsDragging(false);
            if (e.dataTransfer.files.length) {
                addFiles(e.dataTransfer.files);
            }
        },
        [addFiles]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files?.length) {
                addFiles(e.target.files);
                // Reset input so same file can be re-added if removed
                e.target.value = "";
            }
        },
        [addFiles]
    );

    const removeFile = useCallback(
        (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id)),
        []
    );

    const updateFile = useCallback(
        (id: string, updates: Partial<UploadFile>) =>
            setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
            ),
        []
    );

    const handleSubmit = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setUploadError("");

        try {
            const formData = new FormData();
            files.forEach((f) => {
                formData.append("files", f.file);
                formData.append(
                    "metadata",
                    JSON.stringify({
                        id: f.id,
                        title: f.title,
                        artist: f.artist,
                        album: f.album,
                        year: f.year,
                        track: f.track,
                    })
                );
            });

            // TODO: implement /downloader/upload endpoint in backend
            const res = await fetch(`${BACKEND_URL}/downloader/upload`, {
                method: "POST",
                credentials: "include",
                body: formData,
                // No Content-Type header — let browser set multipart boundary
            });

            if (!res.ok) {
                throw new Error(`Upload failed: ${res.status}`);
            }

            setFiles([]);
            onClose();
        } catch (err) {
            console.error("Upload error:", err);
            setUploadError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (uploading) return; // prevent closing while uploading
        setFiles([]);
        setUploadError("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        // Backdrop — close on click outside modal
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 md:items-center"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            {/* Modal panel — bottom sheet on mobile, centered dialog on desktop */}
            <div className="flex h-[92vh] w-full flex-col rounded-t-2xl bg-neutral-900 p-5 md:h-[85vh] md:max-w-3xl md:rounded-2xl md:p-6">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            Upload Music
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            MP3, FLAC, OGG, M4A or ZIP with albums
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drop zone */}
                <div
                    className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                        isDragging
                            ? "border-pink-500 bg-pink-500/10"
                            : "border-neutral-700 hover:border-neutral-500"
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept=".mp3,.zip,.flac,.ogg,.m4a"
                        multiple
                        id="upload-file-input"
                        className="sr-only"
                        onChange={handleInputChange}
                    />

                    {files.length === 0 ? (
                        // Empty drop zone
                        <label
                            htmlFor="upload-file-input"
                            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 p-8 text-center text-neutral-400"
                        >
                            <Upload className="h-14 w-14 opacity-60" />
                            <div>
                                <p className="text-base font-semibold text-white">
                                    Drag & drop your files here
                                </p>
                                <p className="mt-1 text-sm">
                                    or{" "}
                                    <span className="text-pink-400 underline">
                                        browse files
                                    </span>
                                </p>
                            </div>
                            <p className="text-xs opacity-60">
                                MP3 · FLAC · OGG · M4A · ZIP
                            </p>
                        </label>
                    ) : (
                        // File list
                        <div className="flex flex-col overflow-hidden p-3">
                            {/* "Add more" link */}
                            <label
                                htmlFor="upload-file-input"
                                className="mb-2 inline-flex cursor-pointer items-center gap-1 self-start text-sm text-pink-400 hover:text-pink-300"
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Add more files
                            </label>

                            {/* Scrollable list */}
                            <div className="flex-1 overflow-y-auto">
                                <ul className="space-y-2">
                                    {files.map((file) => (
                                        <li
                                            key={file.id}
                                            className="flex items-start gap-3 rounded-lg bg-neutral-800 p-3"
                                        >
                                            {/* File type icon */}
                                            <div className="mt-1 shrink-0">
                                                {/\.zip$/i.test(
                                                    file.file.name
                                                ) ? (
                                                    <FileArchive className="h-7 w-7 text-blue-400" />
                                                ) : (
                                                    <FileAudio className="h-7 w-7 text-pink-400" />
                                                )}
                                            </div>

                                            {/* Metadata fields */}
                                            <div className="min-w-0 flex-1 space-y-2">
                                                {/* Row 1: Title + Track # */}
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={file.title}
                                                        onChange={(e) =>
                                                            updateFile(
                                                                file.id,
                                                                {
                                                                    title: e
                                                                        .target
                                                                        .value,
                                                                }
                                                            )
                                                        }
                                                        placeholder="Title"
                                                        className="min-w-0 flex-1 rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={file.track}
                                                        onChange={(e) =>
                                                            updateFile(
                                                                file.id,
                                                                {
                                                                    track: e
                                                                        .target
                                                                        .value,
                                                                }
                                                            )
                                                        }
                                                        placeholder="#"
                                                        inputMode="numeric"
                                                        className="w-14 rounded-md bg-neutral-700 px-2 py-1.5 text-center text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                                    />
                                                </div>
                                                {/* Row 2: Artist + Album + Year */}
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={file.artist}
                                                        onChange={(e) =>
                                                            updateFile(
                                                                file.id,
                                                                {
                                                                    artist: e
                                                                        .target
                                                                        .value,
                                                                }
                                                            )
                                                        }
                                                        placeholder="Artist"
                                                        className="min-w-0 flex-1 rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={file.album}
                                                        onChange={(e) =>
                                                            updateFile(
                                                                file.id,
                                                                {
                                                                    album: e
                                                                        .target
                                                                        .value,
                                                                }
                                                            )
                                                        }
                                                        placeholder="Album"
                                                        className="min-w-0 flex-1 rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={file.year}
                                                        onChange={(e) =>
                                                            updateFile(
                                                                file.id,
                                                                {
                                                                    year: e
                                                                        .target
                                                                        .value,
                                                                }
                                                            )
                                                        }
                                                        placeholder="Year"
                                                        inputMode="numeric"
                                                        className="w-20 rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Remove button */}
                                            <button
                                                onClick={() =>
                                                    removeFile(file.id)
                                                }
                                                className="mt-1 shrink-0 rounded-md p-1 text-neutral-500 transition hover:bg-neutral-700 hover:text-white"
                                                aria-label={`Remove ${file.file.name}`}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between gap-3">
                    {uploadError ? (
                        <p className="text-sm text-red-400">{uploadError}</p>
                    ) : (
                        <p className="text-xs text-neutral-500">
                            {files.length > 0
                                ? `${files.length} file${files.length > 1 ? "s" : ""} ready`
                                : "No files selected"}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            disabled={uploading}
                            className="rounded-md border border-neutral-600 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-white disabled:opacity-50"
                        >
                            {$vocabulary.CANCEL}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={files.length === 0 || uploading}
                            className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {uploading ? "Uploading…" : "Upload"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
