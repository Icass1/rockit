"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Radio, Search, Settings, Users } from "lucide-react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

const navItems = [
    { href: "/", icon: Home, label: "HOME" },
    { href: "/library", icon: Library, label: "LIBRARY" },
    { href: "/search", icon: Search, label: "SEARCH" },
    { href: "/radio", icon: Radio, label: "RADIO" },
    { href: "/friends", icon: Users, label: "FRIENDS" },
    { href: "/settings", icon: Settings, label: "SETTINGS" },
] as const;

export default function MobileBottomNav({
    adaptive = true,
}: {
    adaptive?: boolean;
}): JSX.Element {
    const activePage = usePathname();
    const vocabulary = useVocabulary();

    return (
        <nav
            className={`border-border-subtle bg-background fixed right-0 bottom-0 left-0 z-40 flex min-h-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] items-center justify-around border-t pb-[calc(env(safe-area-inset-bottom,0px)+12px)] ${adaptive ? "md:hidden" : ""}`}
        >
            {navItems.map((item) => {
                const isActive = activePage === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-label={vocabulary[item.label]}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex h-full w-full items-center justify-center transition-colors ${
                            isActive
                                ? "text-foreground-strong"
                                : "text-subtle-foreground"
                        }`}
                    >
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                    </Link>
                );
            })}
        </nav>
    );
}
