import { configureOfflineArtwork } from "@rockit/platform-browser/offline/db";

configureOfflineArtwork(
    (url) => `/_next/image?url=${encodeURIComponent(url)}&w=384&q=75`
);

export * from "@rockit/platform-browser/offline/store";
