"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { Plus } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export default function NewPlaylistButton(): JSX.Element {
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const handleCreate = async (): Promise<void> => {
        if (!name.trim()) {
            setError($vocabulary.ENTER_NEW_PLAYLIST_NAME);
            return;
        }

        setLoading(true);
        try {
            const res = await Http.createPlaylistAsync({
                name: name.trim(),
                description: null,
                isPublic: true,
            });

            if (res.isOk()) {
                router.push(`/playlist/${res.result.publicId}`);
                closeModal();
            }
        } catch {
            setError($vocabulary.ERROR_CREATING_PLAYLIST);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = (): void => {
        setShowModal(false);
        setName("");
        setError("");
    };

    return (
        <>
            {/* Tile */}
            <div className="mx-auto w-full max-w-62.5">
                <div
                    role="button"
                    tabIndex={0}
                    className="library-item flex h-full w-full max-w-full min-w-0 cursor-pointer flex-col transition-transform md:hover:scale-110"
                    onClick={(): void => setShowModal(true)}
                    onKeyDown={(e): false | void =>
                        e.key === "Enter" && setShowModal(true)
                    }
                >
                <div className="cover relative aspect-square h-auto w-full">
                    <Image
                        alt=""
                        className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md"
                        src="/rockit-background.png"
                        width={600}
                        height={600}
                    />
                    <Plus className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md p-6" />
                </div>
                <label className="min-h-6 cursor-pointer truncate text-center font-semibold">
                    {$vocabulary.NEW_PLAYLIST}
                </label>
            </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
                    onClick={(e): void => {
                        // Close on backdrop click
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="flex w-full max-w-sm flex-col gap-y-4 rounded-xl bg-neutral-900 p-6 shadow-2xl">
                        <label className="text-base font-semibold text-white">
                            {$vocabulary.NEW_PLAYLIST_NAME}
                            {error && (
                                <span className="ml-2 text-red-400">
                                    — {error}
                                </span>
                            )}
                        </label>

                        <input
                            className={`w-full border-b border-solid bg-transparent text-xl font-bold outline-none ${
                                error
                                    ? "border-red-500 text-red-400"
                                    : "border-neutral-600 text-white"
                            }`}
                            value={name}
                            type="text"
                            autoFocus
                            placeholder={$vocabulary.PLACEHOLDER_PLAYLIST_NAME}
                            onChange={(e): void => {
                                setName(e.target.value);
                                setError("");
                            }}
                            onKeyDown={(e): void => {
                                if (e.key === "Enter") handleCreate();
                                if (e.key === "Escape") closeModal();
                            }}
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-300 hover:text-white"
                                onClick={closeModal}
                            >
                                {$vocabulary.CANCEL}
                            </button>
                            <button
                                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={handleCreate}
                                disabled={loading || !name.trim()}
                            >
                                {loading
                                    ? $vocabulary.CREATING
                                    : $vocabulary.CREATE}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
