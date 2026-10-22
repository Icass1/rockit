import type { CollectionPager } from "@/managers/collectionPager";
import type { TMedia } from "@/models/types/media";

export interface CollectionTreeOptions {
    showMediaIndex: boolean;
    showMediaImage: boolean;
}

export type CollectionTreeRow = {
    key: string;
    depth: number;
} & (
    | {
          kind: "media";
          media: TMedia;
          index: number;
          parentPublicId: string;
          expanded: boolean;
          cycle: boolean;
          showMediaIndex: boolean;
          showMediaImage: boolean;
      }
    | {
          kind: "controls";
          collectionKey: string;
          pager: CollectionPager;
      }
    | { kind: "footer"; collectionKey: string; pager: CollectionPager }
);

export interface CollectionTreeBranch {
    pager: CollectionPager;
    unsubscribe?: () => void;
}

export type CollectionTreeTask =
    | {
          kind: "collection";
          key: string;
          depth: number;
          ancestors: Set<string>;
          options: CollectionTreeOptions;
      }
    | {
          kind: "entry";
          row: Extract<CollectionTreeRow, { kind: "media" }>;
          ancestors: Set<string>;
      }
    | { kind: "footer"; row: CollectionTreeRow };
