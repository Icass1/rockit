export function getImageUrl({
    imageId,
    width,
    height,
    fallback,
    placeHolder,
    blur = false,
}: {
    imageId: string | undefined;
    width?: number;
    height?: number;
    fallback?: string;
    placeHolder?: string;
    blur?: boolean;
}) {
    if (!imageId) {
        if (fallback) {
            return fallback;
        } else {
            return placeHolder;
        }
    }

    if (blur == true) {
        return `/api/image/blur/${imageId}`;
    }

    if (!width || !height) {
        return `/api/image/${imageId}`;
    }

    if (typeof window == "undefined") {
        return `/api/image/${imageId}_${width}x${height}`;
    } else {
        return `/api/image/${imageId}_${Math.round(width * window.devicePixelRatio)}x${Math.round(height * window.devicePixelRatio)}`;
    }
}
