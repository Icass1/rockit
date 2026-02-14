import { RockItExternalImage } from "../rockit/rockItExternalImage";

export function getBestImage(images: RockItExternalImage[]) {
    if (images.length === 0) {
        return null;
    }

    // Sort images by width (descending), then by height (descending)
    const sortedImages = images.sort((a, b) => {
        if (b.width === null && a.width === null) {
            return 0;
        }
        if (b.width === null) {
            return -1;
        }
        if (a.width === null) {
            return 1;
        }
        if (b.width !== a.width) {
            return b.width - a.width;
        }
        if (b.height === null && a.height === null) {
            return 0;
        }
        if (b.height === null) {
            return -1;
        }
        if (a.height === null) {
            return 1;
        }
        return b.height - a.height;
    });

    // Return the URL of the best image
    return sortedImages[0];
}
