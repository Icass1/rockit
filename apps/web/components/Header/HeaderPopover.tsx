import type { JSX, ReactNode } from "react";

export default function HeaderPopover({
    id,
    label,
    className = "",
    children,
}: {
    id: string;
    label: string;
    className?: string;
    children: ReactNode;
}): JSX.Element {
    return (
        <section
            id={id}
            aria-label={label}
            className={`absolute top-full right-0 z-50 mt-3 rounded-2xl border border-white/10 bg-neutral-900 text-white shadow-2xl ${className}`}
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-[7px] right-[13px] h-3 w-3 rotate-45 border-t border-l border-white/10 bg-neutral-900"
            />
            {children}
        </section>
    );
}
