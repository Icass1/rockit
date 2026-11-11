import { featuredArtworkPath } from "./featuredArtworkPath";

export const featuredArtworkSource = (kind: string) => ({
    uri: featuredArtworkPath(kind),
});
