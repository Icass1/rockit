import { createLucideIcon } from "lucide-react-native";
import { EXPLICIT_MARK_PATH } from "./explicitMark";

export const ExplicitMark = createLucideIcon("ExplicitMark", [
    ["path", { d: EXPLICIT_MARK_PATH, fillRule: "evenodd", key: "mark" }],
]);

export * from "lucide-react-native";
