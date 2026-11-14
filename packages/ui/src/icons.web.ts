import { createLucideIcon } from "lucide-react";
import { EXPLICIT_MARK_PATH } from "./explicitMark";

export const ExplicitMark = createLucideIcon("ExplicitMark", [
    ["path", { d: EXPLICIT_MARK_PATH, fillRule: "evenodd", key: "mark" }],
]);

export * from "lucide-react";
