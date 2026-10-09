import { createContext } from "react";
import type { CollectionScrollViewport } from "@/models/interfaces/collectionScrollViewport";

export const CollectionScrollContext =
    createContext<CollectionScrollViewport | null>(null);
