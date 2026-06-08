"use client";

import { useCallback, useRef, useState, type JSX } from "react";
import {
    UploadResponseSchema,
    type UploadSongRequest,
} from "@/dto";
import { BACKEND_URL } from "@/environment";
import { useStore } from "@nanostores/react";
import { Http } from "@/lib/http";
import {
    Clapperboard,
    DiscAlbum,
    FileArchive,
    FileAudio,
    FileVideo,
    Image,
    Music,
    Upload,
    X,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

// Types.

type UploadType = "song" | "album" | "video";

interface SongFile {
    id: string;
    file: File;
    title: string;
    artist: string;
    track: string;
    imageFile: File | null;
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Filename parser.

function parseSongFilename(
    filename: string
): Pick<SongFile, "title" | "artist" | "track"> {
    const nameWithoutExt = filename.replace(
        /\.(mp3|zip|flac|ogg|m4a|wav|aac)$/i,
        ""
    );

    const trackMatch = nameWithoutExt.match(/^(\d{1,3})\s*[-._]\s*/);
    let track = "";
    let remaining = nameWithoutExt;
    if (trackMatch) {
        track = String(parseInt(trackMatch[1], 10));
        remaining = nameWithoutExt.slice(trackMatch[0].length);
    }

    const yearMatch = remaining.match(/\((\d{4})\)/);
    if (yearMatch) {
        remaining = remaining.replace(yearMatch[0], "").trim();
    }

    const parts = remaining.split(/\s*[-–—]\s*/);
    let artist = "";
    let title = remaining.trim();
    if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    }

    return { title, artist, track };
}

// Upload progress helpers.

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function uploadFormDataWithProgress(
    url: string,
    formData: FormData,
    onProgress: (loaded: number) => void
): Promise<Response> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open("POST", url);

        xhr.upload.onprogress = (e: ProgressEvent): void => {
            if (e.lengthComputable) {
                onProgress(e.loaded);
            }
        };

        xhr.onload = (): void => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(
                    new Response(xhr.responseText, {
                        status: xhr.status,
                        statusText: xhr.statusText,
                    })
                );
            } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
            }
        };

        xhr.onerror = (): void => reject(new Error("Network error"));
        xhr.send(formData);
    });
}

// Constants.

const ACCEPTED_AUDIO = ".mp3,.flac,.ogg,.m4a,.wav,.aac,.zip";
const ACCEPTED_VIDEO = ".mp4,.webm,.mkv,.avi,.mov";
const ACCEPTED_IMAGE = ".jpg,.jpeg,.png,.webp";

// Component.

export default function UploadModal({
    isOpen,
    onClose,
}: UploadModalProps): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [uploadType, setUploadType] = useState<UploadType>("song");
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [uploadedBytes, setUploadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);

    // Song state
    const [files, setFiles] = useState<SongFile[]>([]);

    // Album state
    const [albumTitle, setAlbumTitle] = useState("");
    const [albumArtist, setAlbumArtist] = useState("");
    const [coverFile, setCoverFile] = useState<File | null>(null);

    // Video state
    const [videoTitle, setVideoTitle] = useState("");
    const [videoArtist, setVideoArtist] = useState("");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoImageFile, setVideoImageFile] = useState<File | null>(null);

    const dragCounter = useRef(0);

    // Reset.

    const reset = useCallback((): void => {
        setFiles([]);
        setAlbumTitle("");
        setAlbumArtist("");
        setCoverFile(null);
        setVideoTitle("");
        setVideoArtist("");
        setVideoFile(null);
        setVideoImageFile(null);
        setUploadError("");
        setProgress(0);
        setTotal(0);
        setUploadedBytes(0);
        setTotalBytes(0);
    }, []);

    const handleClose = useCallback((): void => {
        if (uploading) return;
        reset();
        onClose();
    }, [uploading, reset, onClose]);

    // File helpers.

    const addAudioFiles = useCallback((fileList: FileList | File[]): void => {
        const accepted = Array.from(fileList).filter((f): boolean =>
            /\.(mp3|flac|ogg|m4a|wav|aac)$/i.test(f.name)
        );
        const parsed: SongFile[] = accepted.map(
            (file): SongFile => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                imageFile: null,
                ...parseSongFilename(file.name),
            })
        );
        setFiles((prev): SongFile[] => [...prev, ...parsed]);
    }, []);

    const pickVideoFile = useCallback((fileList: FileList | File[]): void => {
        const file = Array.from(fileList).find((f): boolean =>
            /\.(mp4|webm|mkv|avi|mov)$/i.test(f.name)
        );
        if (file) setVideoFile(file);
    }, []);

    const pickCoverFile = useCallback((fileList: FileList | File[]): void => {
        const file = Array.from(fileList).find((f): boolean =>
            /\.(jpg|jpeg|png|webp)$/i.test(f.name)
        );
        if (file) setCoverFile(file);
    }, []);

    const removeFile = useCallback(
        (id: string): void =>
            setFiles((prev): SongFile[] =>
                prev.filter((f): boolean => f.id !== id)
            ),
        []
    );

    const updateFile = useCallback(
        (id: string, updates: Partial<SongFile>): void =>
            setFiles((prev): SongFile[] =>
                prev.map(
                    (f): SongFile => (f.id === id ? { ...f, ...updates } : f)
                )
            ),
        []
    );

    // Drag / drop.

    const handleDragEnter = useCallback((e: React.DragEvent): void => {
        e.preventDefault();
        dragCounter.current++;
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent): void => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent): void => {
            e.preventDefault();
            dragCounter.current = 0;
            setIsDragging(false);
            const list = e.dataTransfer.files;
            if (!list.length) return;
            if (uploadType === "video") {
                pickVideoFile(list);
            } else {
                addAudioFiles(list);
            }
        },
        [uploadType, addAudioFiles, pickVideoFile]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>): void => {
            const list = e.target.files;
            if (!list?.length) return;

            const dataType = e.target.dataset.uploadType;
            if (dataType === "cover") {
                pickCoverFile(list);
            } else if (dataType === "video-image") {
                const f = Array.from(list).find((fl): boolean =>
                    /\.(jpg|jpeg|png|webp)$/i.test(fl.name)
                );
                if (f) setVideoImageFile(f);
            } else if (dataType?.startsWith("song-image-")) {
                const songId = dataType.replace("song-image-", "");
                const f = Array.from(list).find((fl): boolean =>
                    /\.(jpg|jpeg|png|webp)$/i.test(fl.name)
                );
                if (f) updateFile(songId, { imageFile: f });
            } else if (uploadType === "video") {
                pickVideoFile(list);
            } else {
                addAudioFiles(list);
            }
            e.target.value = "";
        },
        [uploadType, addAudioFiles, pickVideoFile, pickCoverFile, updateFile]
    );

    // Validation.
    const canSubmitSong = files.length > 0;
    const canSubmitAlbum = albumTitle.trim().length > 0 && files.length > 0;
    const canSubmitVideo = videoFile !== null && videoTitle.trim().length > 0;

    // Submit.
    const handleSubmit = async (): Promise<void> => {
        setUploading(true);
        setUploadError("");

        try {
            if (uploadType === "song") {
                await uploadSongsAsync();
            } else if (uploadType === "album") {
                await uploadAlbumAsync();
            } else {
                await uploadVideoAsync();
            }
            reset();
            onClose();
        } catch (err) {
            console.error("Upload error:", err);
            setUploadError($vocabulary.UPLOAD_ERROR);
        } finally {
            setUploading(false);
        }
    };

    async function uploadSongsAsync(): Promise<void> {
        const totalBytesValue = files.reduce((sum, f) => sum + f.file.size, 0);
        setTotalBytes(totalBytesValue);
        setTotal(files.length);
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const startResult = await Http.startSongUpload({
                title: f.title,
                artistNames: f.artist ? [f.artist] : [],
                fileSize: f.file.size,
                discNumber: 0,
                trackNumber: parseInt(f.track, 10) || 0,
            });
            if (!startResult.isOk())
                throw new Error(`Start song upload failed: ${startResult.code}`);
            const { uploadId } = startResult.result;

            const fd = new FormData();
            fd.append("file", f.file);
            if (f.imageFile) fd.append("image", f.imageFile);
            const cumulativeBytes = files
                .slice(0, i)
                .reduce((sum, sf) => sum + sf.file.size, 0);
            const fileRes = await uploadFormDataWithProgress(
                `${BACKEND_URL}/upload/${uploadId}/file`,
                fd,
                (loaded: number): void => {
                    setUploadedBytes(cumulativeBytes + loaded);
                }
            );
            if (!fileRes.ok)
                throw new Error(`Song file upload failed: ${fileRes.status}`);
            UploadResponseSchema.parse(await fileRes.json());
            setProgress(i + 1);
        }
    }

    async function uploadAlbumAsync(): Promise<void> {
        const songCount = files.length;
        const coverBytes = coverFile ? coverFile.size : 0;
        const songsBytes = files.reduce((sum, f) => sum + f.file.size, 0);
        const totalBytesValue = coverBytes + songsBytes;
        setTotalBytes(totalBytesValue);
        setTotal(songCount + (coverFile ? 1 : 0));

        const songsPayload = files.map(
            (f): UploadSongRequest => ({
                title: f.title,
                artistNames: f.artist
                    ? [f.artist]
                    : albumArtist
                      ? [albumArtist]
                      : [],
                fileSize: f.file.size,
                discNumber: 0,
                trackNumber: parseInt(f.track, 10) || 0,
            })
        );

        const startResult = await Http.startAlbumUpload({
            title: albumTitle,
            artistNames: albumArtist ? [albumArtist] : [],
            songs: songsPayload,
            releaseDate: "",
        });
        if (!startResult.isOk())
            throw new Error(`Start album upload failed: ${startResult.code}`);
        const { uploadId } = startResult.result;

        let p = 0;
        let cumulativeBytes = 0;

        if (coverFile) {
            const cf = new FormData();
            cf.append("file", coverFile);
            const coverRes = await uploadFormDataWithProgress(
                `${BACKEND_URL}/upload/album/${uploadId}/cover`,
                cf,
                (loaded: number): void => {
                    setUploadedBytes(cumulativeBytes + loaded);
                }
            );
            if (!coverRes.ok)
                throw new Error(
                    `Album cover upload failed: ${coverRes.status}`
                );
            cumulativeBytes += coverFile.size;
            setUploadedBytes(cumulativeBytes);
            setProgress(++p);
        }

        for (let i = 0; i < songCount; i++) {
            const sf = new FormData();
            sf.append("file", files[i].file);
            const songRes = await uploadFormDataWithProgress(
                `${BACKEND_URL}/upload/album/${uploadId}/song-index/${i}`,
                sf,
                (loaded: number): void => {
                    setUploadedBytes(cumulativeBytes + loaded);
                }
            );
            if (!songRes.ok)
                throw new Error(`Album song upload failed: ${songRes.status}`);
            UploadResponseSchema.parse(await songRes.json());
            cumulativeBytes += files[i].file.size;
            setUploadedBytes(cumulativeBytes);
            setProgress(++p);
        }
    }

    async function uploadVideoAsync(): Promise<void> {
        if (!videoFile) return;
        setTotalBytes(videoFile.size);
        setTotal(1);

        const startResult = await Http.startVideoUpload({
            title: videoTitle,
            artistNames: videoArtist ? [videoArtist] : [],
            fileSize: videoFile.size,
        });
        if (!startResult.isOk())
            throw new Error(`Start video upload failed: ${startResult.code}`);
        const { uploadId } = startResult.result;

        const fd = new FormData();
        fd.append("file", videoFile);
        if (videoImageFile) fd.append("image", videoImageFile);
        const fileRes = await uploadFormDataWithProgress(
            `${BACKEND_URL}/upload/${uploadId}/file`,
            fd,
            (loaded: number): void => {
                setUploadedBytes(loaded);
            }
        );
        if (!fileRes.ok)
            throw new Error(`Video file upload failed: ${fileRes.status}`);
        UploadResponseSchema.parse(await fileRes.json());
        setProgress(1);
    }

    // Render helpers.

    const renderEmptyDropZone = (accept: string, hint: string): JSX.Element => (
        <label
            htmlFor="upload-file-input"
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 p-8 text-center text-neutral-400"
        >
            <Upload className="h-14 w-14 opacity-60" />
            <div>
                <p className="text-base font-semibold text-white">
                    {$vocabulary.UPLOAD_DROP_ZONE}
                </p>
                <p className="mt-1 text-sm">{$vocabulary.UPLOAD_BROWSE}</p>
            </div>
            <p className="text-xs opacity-60">{hint}</p>
        </label>
    );

    const renderFileInput = (
        accept: string,
        multiple: boolean,
        dataType?: string
    ): JSX.Element => (
        <input
            type="file"
            accept={accept}
            multiple={multiple}
            id="upload-file-input"
            className="sr-only"
            data-upload-type={dataType ?? ""}
            onChange={handleInputChange}
        />
    );

    const renderSongList = (): JSX.Element => (
        <div className="flex flex-col overflow-hidden p-3">
            <label
                htmlFor="upload-file-input"
                className="mb-2 inline-flex cursor-pointer items-center gap-1 self-start text-sm text-pink-400 hover:text-pink-300"
            >
                <Upload className="h-3.5 w-3.5" />
                {$vocabulary.UPLOAD_ADD_MORE}
            </label>
            <div className="flex-1 overflow-y-auto">
                <ul className="space-y-2">
                    {files.map(
                        (file): JSX.Element => (
                            <li
                                key={file.id}
                                className="flex items-start gap-3 rounded-lg bg-neutral-800 p-3"
                            >
                                <div className="mt-1 shrink-0">
                                    {/\.zip$/i.test(file.file.name) ? (
                                        <FileArchive className="h-7 w-7 text-blue-400" />
                                    ) : (
                                        <FileAudio className="h-7 w-7 text-pink-400" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={file.title}
                                            onChange={(e): void =>
                                                updateFile(file.id, {
                                                    title: e.target.value,
                                                })
                                            }
                                            placeholder={
                                                $vocabulary.UPLOAD_TITLE_FIELD
                                            }
                                            className="min-w-0 flex-1 rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={file.track}
                                            onChange={(e): void =>
                                                updateFile(file.id, {
                                                    track: e.target.value,
                                                })
                                            }
                                            placeholder={
                                                $vocabulary.UPLOAD_TRACK_FIELD
                                            }
                                            inputMode="numeric"
                                            className="w-14 rounded-md bg-neutral-700 px-2 py-1.5 text-center text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={file.artist}
                                        onChange={(e): void =>
                                            updateFile(file.id, {
                                                artist: e.target.value,
                                            })
                                        }
                                        placeholder={
                                            $vocabulary.UPLOAD_ARTIST_FIELD
                                        }
                                        className="w-full rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                    />
                                    <label
                                        htmlFor={`song-image-${file.id}`}
                                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition ${
                                            file.imageFile
                                                ? "bg-green-500/10 text-green-400"
                                                : "bg-neutral-700 text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        {/* eslint-disable-next-line jsx-a11y/alt-text -- lucide-react SVG icon */}
                                        <Image className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            {file.imageFile
                                                ? file.imageFile.name
                                                : $vocabulary.UPLOAD_COVER_HINT}
                                        </span>
                                    </label>
                                    <input
                                        type="file"
                                        accept={ACCEPTED_IMAGE}
                                        id={`song-image-${file.id}`}
                                        className="sr-only"
                                        data-upload-type={`song-image-${file.id}`}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <button
                                    onClick={(): void => removeFile(file.id)}
                                    className="mt-1 shrink-0 rounded-md p-1 text-neutral-500 transition hover:bg-neutral-700 hover:text-white"
                                    aria-label={`Remove ${file.file.name}`}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </li>
                        )
                    )}
                </ul>
            </div>
        </div>
    );

    const renderSongContent = (): JSX.Element => (
        <>
            {renderFileInput(ACCEPTED_AUDIO, true)}
            {files.length === 0
                ? renderEmptyDropZone(
                      ACCEPTED_AUDIO,
                      "MP3 · FLAC · OGG · M4A · ZIP"
                  )
                : renderSongList()}
        </>
    );

    const renderCoverDrop = (): JSX.Element => (
        <div
            className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-4 transition ${
                coverFile
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-neutral-700 hover:border-neutral-500"
            }`}
            onClick={(): void => {
                const el = document.getElementById("cover-file-input");
                if (el) el.click();
            }}
        >
            {coverFile ? (
                <div className="flex items-center gap-2 text-sm text-green-400">
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- lucide-react SVG icon */}
                    <Image className="h-5 w-5" />
                    <span>{coverFile.name}</span>
                </div>
            ) : (
                <span className="flex items-center gap-2 text-sm text-neutral-400">
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- lucide-react SVG icon */}
                    <Image className="h-5 w-5" />
                    {$vocabulary.UPLOAD_COVER_HINT}
                </span>
            )}
        </div>
    );

    const renderAlbumContent = (): JSX.Element => (
        <div className="flex flex-col gap-3 overflow-y-auto p-3">
            {/* Hidden audio + cover inputs */}
            {renderFileInput(ACCEPTED_AUDIO, true)}
            <input
                type="file"
                accept={ACCEPTED_IMAGE}
                id="cover-file-input"
                className="sr-only"
                data-upload-type="cover"
                onChange={handleInputChange}
            />

            {/* Album title */}
            <input
                type="text"
                value={albumTitle}
                onChange={(e): void => setAlbumTitle(e.target.value)}
                placeholder={$vocabulary.UPLOAD_ALBUM_TITLE}
                className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
            />

            {/* Album artist */}
            <input
                type="text"
                value={albumArtist}
                onChange={(e): void => setAlbumArtist(e.target.value)}
                placeholder={$vocabulary.UPLOAD_ARTIST_FIELD}
                className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
            />

            {/* Cover drop */}
            {renderCoverDrop()}

            {/* Songs */}
            <div className="mt-1 text-xs font-medium tracking-wide text-neutral-400 uppercase">
                {$vocabulary.UPLOAD_SONGS}
            </div>
            <label
                htmlFor="upload-file-input"
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 p-4 text-sm text-neutral-400 transition hover:border-neutral-500"
            >
                <Upload className="mr-2 h-4 w-4" />
                {$vocabulary.UPLOAD_ADD_MORE}
            </label>

            {files.length > 0 && (
                <ul className="space-y-2">
                    {files.map(
                        (file, idx): JSX.Element => (
                            <li
                                key={file.id}
                                className="flex items-start gap-3 rounded-lg bg-neutral-800 p-3"
                            >
                                <span className="mt-1 w-5 shrink-0 text-right text-xs font-bold text-neutral-500">
                                    {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <input
                                        type="text"
                                        value={file.title}
                                        onChange={(e): void =>
                                            updateFile(file.id, {
                                                title: e.target.value,
                                            })
                                        }
                                        placeholder={
                                            $vocabulary.UPLOAD_TITLE_FIELD
                                        }
                                        className="w-full rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={file.artist}
                                        onChange={(e): void =>
                                            updateFile(file.id, {
                                                artist: e.target.value,
                                            })
                                        }
                                        placeholder={
                                            $vocabulary.UPLOAD_ARTIST_FIELD
                                        }
                                        className="w-full rounded-md bg-neutral-700 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={(): void => removeFile(file.id)}
                                    className="mt-1 shrink-0 rounded-md p-1 text-neutral-500 transition hover:bg-neutral-700 hover:text-white"
                                    aria-label={`Remove ${file.file.name}`}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </li>
                        )
                    )}
                </ul>
            )}
        </div>
    );

    const renderVideoContent = (): JSX.Element => (
        <div className="flex flex-col gap-3 p-3">
            {renderFileInput(ACCEPTED_VIDEO, false)}
            <input
                type="file"
                accept={ACCEPTED_IMAGE}
                id="video-image-input"
                className="sr-only"
                data-upload-type="video-image"
                onChange={handleInputChange}
            />

            {!videoFile ? (
                <label
                    htmlFor="upload-file-input"
                    className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 p-8 text-center text-neutral-400"
                >
                    <FileVideo className="h-14 w-14 opacity-60" />
                    <p className="text-base font-semibold text-white">
                        {$vocabulary.UPLOAD_DROP_ZONE}
                    </p>
                    <p className="text-xs opacity-60">
                        MP4 · WEBM · MKV · AVI · MOV
                    </p>
                </label>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg bg-neutral-800 p-3">
                        <FileVideo className="h-7 w-7 shrink-0 text-blue-400" />
                        <div className="min-w-0 flex-1 truncate">
                            <p className="truncate text-sm font-medium text-white">
                                {videoFile.name}
                            </p>
                            <p className="text-xs text-neutral-400">
                                {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                        </div>
                        <button
                            onClick={(): void => setVideoFile(null)}
                            className="shrink-0 rounded-md p-1 text-neutral-500 transition hover:bg-neutral-700 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={videoTitle}
                        onChange={(e): void => setVideoTitle(e.target.value)}
                        placeholder={$vocabulary.UPLOAD_VIDEO_TITLE}
                        className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                    />
                    <input
                        type="text"
                        value={videoArtist}
                        onChange={(e): void => setVideoArtist(e.target.value)}
                        placeholder={$vocabulary.UPLOAD_ARTIST_FIELD}
                        className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                    />
                    <label
                        htmlFor="video-image-input"
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                            videoImageFile
                                ? "bg-green-500/10 text-green-400"
                                : "bg-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                    >
                        {/* eslint-disable-next-line jsx-a11y/alt-text -- lucide-react SVG icon */}
                        <Image className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            {videoImageFile
                                ? videoImageFile.name
                                : $vocabulary.UPLOAD_COVER_HINT}
                        </span>
                    </label>
                </div>
            )}
        </div>
    );

    const renderStatusText = (): string => {
        if (total > 0)
            return `${$vocabulary.UPLOAD_IN_PROGRESS} ${progress}/${total}`;
        if (uploadType === "song")
            return files.length > 0
                ? `${files.length} ${$vocabulary.UPLOAD_FILES_READY}`
                : $vocabulary.UPLOAD_NO_FILES;
        if (uploadType === "album") {
            if (files.length === 0 && !albumTitle)
                return $vocabulary.UPLOAD_NO_FILES;
            const parts: string[] = [];
            if (albumTitle) parts.push(albumTitle);
            if (files.length > 0)
                parts.push(`${files.length} ${$vocabulary.UPLOAD_SONGS}`);
            return parts.join(" · ") || $vocabulary.UPLOAD_NO_FILES;
        }
        if (uploadType === "video")
            return videoFile ? videoFile.name : $vocabulary.UPLOAD_NO_FILES;
        return "";
    };

    // Render.

    if (!isOpen) return null;

    const tabs: {
        key: UploadType;
        label: string;
        icon: typeof Music;
    }[] = [
        { key: "song", label: $vocabulary.UPLOAD_SONGS, icon: Music },
        { key: "album", label: $vocabulary.UPLOAD_ALBUM, icon: DiscAlbum },
        { key: "video", label: $vocabulary.UPLOAD_VIDEO, icon: Clapperboard },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 md:items-center"
            onClick={(e): void => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="flex h-[92vh] w-full flex-col rounded-t-2xl bg-neutral-900 p-5 md:h-[85vh] md:max-w-3xl md:rounded-2xl md:p-6">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {$vocabulary.UPLOAD_TITLE}
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            {$vocabulary.UPLOAD_HINT}
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

                {/* Type tabs */}
                <div className="mb-4 flex gap-2">
                    {tabs.map(
                        ({ key, label, icon: Icon }): JSX.Element => (
                            <button
                                key={key}
                                onClick={(): void => {
                                    if (!uploading) {
                                        setUploadType(key);
                                        reset();
                                    }
                                }}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                    uploadType === key
                                        ? "bg-pink-600 text-white"
                                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </button>
                        )
                    )}
                </div>

                {/* Drop zone / form */}

                <div
                    className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                        isDragging
                            ? "border-pink-500 bg-pink-500/10"
                            : "border-neutral-700 hover:border-neutral-500"
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={(e): void => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {uploadType === "song" && renderSongContent()}
                    {uploadType === "album" && renderAlbumContent()}
                    {uploadType === "video" && renderVideoContent()}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between gap-3">
                    {uploadError ? (
                        <p className="text-sm text-red-400">{uploadError}</p>
                    ) : totalBytes > 0 ? (
                        <div className="flex flex-1 flex-col gap-1">
                            <div className="h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-neutral-700">
                                <div
                                    className="h-full rounded-full bg-pink-500 transition-all duration-300"
                                    style={{
                                        width: `${(uploadedBytes / totalBytes) * 100}%`,
                                    }}
                                />
                            </div>
                            <p className="text-xs text-neutral-400">
                                {formatBytes(uploadedBytes)} /{" "}
                                {formatBytes(totalBytes)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-neutral-500">
                            {renderStatusText()}
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
                            disabled={
                                uploading ||
                                (uploadType === "song" && !canSubmitSong) ||
                                (uploadType === "album" && !canSubmitAlbum) ||
                                (uploadType === "video" && !canSubmitVideo)
                            }
                            className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {uploading
                                ? $vocabulary.UPLOAD_IN_PROGRESS
                                : $vocabulary.UPLOAD_ACTION}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
