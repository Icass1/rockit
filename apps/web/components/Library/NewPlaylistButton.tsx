"use client";

import { useId, useState, type JSX } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import Dialog from "@/components/Dialog";

export default function NewPlaylistButton({
    variant = "card",
}: {
    variant?: "card" | "row";
}): JSX.Element {
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const nameId = useId();

    const $vocabulary = useVocabulary();

    const handleCreate = async (): Promise<void> => {
        if (loading) return;
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
            } else {
                setError($vocabulary.ERROR_CREATING_PLAYLIST);
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

    const triggerProps = {
        role: "button" as const,
        tabIndex: 0,
        onClick: (): void => setShowModal(true),
        onKeyDown: (e: React.KeyboardEvent): false | void =>
            e.key === "Enter" && setShowModal(true),
    };

    return (
        <>
            {variant === "row" ? (
                <div
                    {...triggerProps}
                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors"
                >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md select-none">
                        <Image
                            alt=""
                            src="/rockit-background.png"
                            fill
                            sizes="48px"
                            className="object-cover"
                            priority
                        />
                        <Plus className="absolute inset-0 h-full w-full p-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-foreground-strong truncate font-medium">
                            {$vocabulary.NEW_PLAYLIST}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mx-auto w-full max-w-62.5">
                    <div
                        {...triggerProps}
                        className="library-item flex h-full w-full max-w-full min-w-0 cursor-pointer flex-col transition-transform md:hover:scale-110"
                    >
                        <div className="cover relative aspect-square h-auto w-full">
                            <Image
                                alt=""
                                className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md select-none"
                                src="/rockit-background.png"
                                width={600}
                                height={600}
                                priority
                            />
                            <Plus className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md p-6 select-none" />
                        </div>
                        <span className="min-h-6 cursor-pointer truncate text-center font-semibold">
                            {$vocabulary.NEW_PLAYLIST}
                        </span>
                    </div>
                </div>
            )}

            <Dialog
                open={showModal}
                onClose={closeModal}
                title={$vocabulary.NEW_PLAYLIST}
            >
                <form
                    className="flex flex-col gap-4"
                    onSubmit={(event): void => {
                        event.preventDefault();
                        void handleCreate();
                    }}
                >
                    <label htmlFor={nameId} className="text-sm font-medium">
                        {$vocabulary.NEW_PLAYLIST_NAME}
                    </label>
                    <input
                        id={nameId}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${nameId}-error` : undefined}
                        className={`w-full border-b border-solid bg-transparent text-xl font-bold outline-none ${
                            error
                                ? "border-destructive text-destructive-soft"
                                : "border-border-strong text-foreground-strong"
                        }`}
                        value={name}
                        type="text"
                        placeholder={$vocabulary.PLACEHOLDER_PLAYLIST_NAME}
                        onChange={(e): void => {
                            setName(e.target.value);
                            setError("");
                        }}
                    />
                    {error && (
                        <p
                            id={`${nameId}-error`}
                            role="alert"
                            className="text-sm text-destructive-soft"
                        >
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            className="overlay-action border border-white/10"
                            type="button"
                            onClick={closeModal}
                        >
                            {$vocabulary.CANCEL}
                        </button>
                        <button
                            className="overlay-action overlay-primary"
                            type="submit"
                            disabled={loading || !name.trim()}
                        >
                            {loading
                                ? $vocabulary.CREATING
                                : $vocabulary.CREATE}
                        </button>
                    </div>
                </form>
            </Dialog>
        </>
    );
}
