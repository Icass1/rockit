import type { ListeningBadgeResponse } from "@rockit/shared/dto/listeningBadgeResponse";

export type MedalBridgeCommand = {
    protocol: "rockit-medal-v1";
    sequence: number;
} & (
    | {
          type: "init";
          instance: string;
          badge: ListeningBadgeResponse;
          ownerName: string;
          colors: Record<string, string>;
      }
    | { type: "front" | "back" | "reset" | "dispose" }
    | { type: "visibility"; active: boolean }
);

export type MedalBridgeEvent =
    | { protocol: "rockit-medal-v1"; type: "boot" }
    | {
          protocol: "rockit-medal-v1";
          type: "ready" | "unavailable";
          instance: string;
      };
