import type { RefObject } from "react";
import type { View } from "react-native";

export interface CollectionScrollViewport {
    viewport: RefObject<View | null>;
    subscribe: (listener: () => void) => () => void;
}
