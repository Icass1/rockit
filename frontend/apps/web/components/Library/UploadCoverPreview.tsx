"use client";

import { useEffect, useRef, type JSX } from "react";

export default function UploadCoverPreview({
    file,
    alt,
}: {
    file: File;
    alt: string;
}): JSX.Element {
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        if (imageRef.current) imageRef.current.src = url;
        return (): void => URL.revokeObjectURL(url);
    }, [file]);

    return (
        // Local file previews use blob URLs and do not need Next.js optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            ref={imageRef}
            alt={alt}
            className="h-20 w-20 shrink-0 rounded-md bg-neutral-700 object-cover"
        />
    );
}
