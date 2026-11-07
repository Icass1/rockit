"use client";

import type { JSX, ReactNode } from "react";
import { Popup } from "@/components/ui/Popup";

export default function Popover({
    id,
    label,
    className = "",
    children,
    onClose,
}: {
    id: string;
    label: string;
    className?: string;
    children: ReactNode;
    onClose: () => void;
}): JSX.Element {
    return (
        <Popup
            id={id}
            label={label}
            open
            onClose={onClose}
            inline
            mobileSheet={false}
            className={className}
        >
            {children}
        </Popup>
    );
}
