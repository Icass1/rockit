"use client";

import type { JSX } from "react";
import { PiPRoot } from "@/components/PiP/PiPRoot";

interface PiPContentProps {
    pipWindow?: Window | null;
}

export default function PiPContent({
    pipWindow,
}: PiPContentProps): JSX.Element {
    return <PiPRoot pipWindow={pipWindow} />;
}
