"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Radio, Search, Settings } from "lucide-react";

const navItems = [
    { href: "/", icon: Home },
    { href: "/library", icon: Library },
    { href: "/search", icon: Search },
    { href: "/radio", icon: Radio },
    { href: "/settings", icon: Settings },
];

export default function MobileBottomNav(): JSX.Element {
    const activePage = usePathname();

    return (
        <nav className="fixed right-0 bottom-0 left-0 z-40 flex min-h-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] items-center justify-around border-t border-neutral-800 bg-#0b0b0b pb-[calc(env(safe-area-inset-bottom,0px)+12px)] md:hidden">
            {navItems.map((item) => {
                const isActive = activePage === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex h-full w-full items-center justify-center transition-colors ${
                            isActive ? "text-white" : "text-neutral-500"
                        }`}
                    >
                        <item.icon className="h-5 w-5" />
                    </Link>
                );
            })}
        </nav>
    );
}
