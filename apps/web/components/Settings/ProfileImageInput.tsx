"use client";

import { useRef, useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { ImageUp, LoaderCircle } from "lucide-react";
import { useSettingsFeedback } from "@/hooks/useSettingsFeedback";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ProfileImageInput({
    image,
    username,
}: {
    image: string;
    username: string;
}): JSX.Element {
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const lang = useStore(rockIt.vocabularyManager.langAtom);
    const notifySaved = useSettingsFeedback();
    const text = (key: string, english: string, spanish: string): string => {
        const value = (vocabulary as unknown as Record<string, string>)[key];
        return value && value !== key
            ? value
            : lang.startsWith("es")
              ? spanish
              : english;
    };
    const changeLabel = text(
        "SETTINGS_CHANGE_PROFILE_IMAGE",
        "Change profile picture",
        "Cambiar imagen de perfil"
    );
    const source =
        image && image !== failedImage
            ? image
            : rockIt.USER_PLACEHOLDER_IMAGE_URL;
    return (
        <div className="flex flex-col items-center gap-2" aria-busy={uploading}>
            <div className="relative">
                <Image
                    src={source}
                    alt={username}
                    width={200}
                    height={200}
                    onError={(): void => setFailedImage(source)}
                    className="h-32 w-32 rounded-full object-cover ring-2 ring-neutral-700 md:h-44 md:w-44"
                />
                <button
                    type="button"
                    aria-label={changeLabel}
                    title={changeLabel}
                    disabled={uploading}
                    onClick={(): void => input.current?.click()}
                    className="absolute right-0 bottom-0 grid size-11 place-items-center rounded-full border border-neutral-600 bg-neutral-800 text-white shadow-lg hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
                >
                    {uploading ? (
                        <LoaderCircle
                            className="size-5 motion-safe:animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <ImageUp className="size-5" aria-hidden="true" />
                    )}
                </button>
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    aria-label={changeLabel}
                    disabled={uploading}
                    onChange={async (event): Promise<void> => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (!file || uploading) return;
                        setUploading(true);
                        try {
                            const saved =
                                await rockIt.userManager.uploadProfileImageAsync(
                                    file
                                );
                            if (saved) notifySaved();
                            else
                                rockIt.notificationManager.notifyError(
                                    text(
                                        "SETTINGS_PROFILE_IMAGE_ERROR",
                                        "Could not save the image. Use JPG, PNG or WebP up to 5 MB.",
                                        "No se pudo guardar la imagen. Usa JPG, PNG o WebP de hasta 5 MB."
                                    )
                                );
                        } finally {
                            setUploading(false);
                        }
                    }}
                />
            </div>
            <p className="text-center text-xs text-neutral-500">
                {text(
                    "SETTINGS_PROFILE_IMAGE_FORMAT",
                    "JPG, PNG or WebP · up to 5 MB",
                    "JPG, PNG o WebP · hasta 5 MB"
                )}
            </p>
        </div>
    );
}
