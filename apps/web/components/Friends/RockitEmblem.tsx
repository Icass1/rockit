"use client";

import type { JSX } from "react";
import { ListeningEmblem } from "@rockit/ui";

/** The original emblem artwork now has one renderer contract for web and mobile. */
export default function RockitEmblem(props: {
    variant: string;
    earned: boolean;
    tier?: number;
    league?: string;
}): JSX.Element {
    return <ListeningEmblem {...props} />;
}
