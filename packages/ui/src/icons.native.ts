import {
    ROCKIT_FIRE_PATH,
    ROCKIT_HAND_SOLID_PATH,
} from "@rockit/ui/headless/likeArtwork";
import { createLucideIcon } from "lucide-react-native";
import { EXPLICIT_MARK_PATH } from "./explicitMark";

export const ExplicitMark = createLucideIcon("ExplicitMark", [
    ["path", { d: EXPLICIT_MARK_PATH, fillRule: "evenodd", key: "mark" }],
]);

export const RockitHandSolid = createLucideIcon("RockitHandSolid", [
    ["path", { d: ROCKIT_HAND_SOLID_PATH, key: "hand" }],
]);
export const RockitFire = createLucideIcon("RockitFire", [
    ["path", { d: ROCKIT_FIRE_PATH, key: "fire" }],
]);

export * from "lucide-react-native";
