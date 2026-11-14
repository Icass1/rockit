import type {
    FeaturedCollectionKey,
    NavigationPinResponse,
} from "@rockit/shared";

export interface LibraryCollectionEntry {
    id: string;
    builtinKey?: FeaturedCollectionKey;
    pin?: NavigationPinResponse;
}
