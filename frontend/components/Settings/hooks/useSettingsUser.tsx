"use client";

import useSession from "@/hooks/useSession";

export function useSettingsUser() {
    const session = useSession();
    return {
        username: session.user?.username ?? "",
        isLoading: session.status === "loading",
        isAuthenticated: session.status === "authenticated",
    };
}

export function UserProfileSection() {
    const { username, isLoading, isAuthenticated } = useSettingsUser();

    if (isLoading) {
        return (
            <>
                <h2 className="mt-4 text-xl font-bold text-white md:text-3xl">
                    Loading
                </h2>
                <p className="text-base text-gray-500 md:text-lg">Loading</p>
            </>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            <h2 className="mt-4 text-xl font-bold text-white md:text-3xl">
                {username}
            </h2>
            <p className="text-base text-gray-500 md:text-lg">@{username}</p>
        </>
    );
}

export function ChangeUsernameInput() {
    const { username, isLoading, isAuthenticated } = useSettingsUser();

    if (isLoading) {
        return <p className="text-base text-gray-500 md:text-lg">Loading</p>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <input
            onChange={() => {
                console.warn("TO DO");
            }}
            type="search"
            className="w-full rounded-lg border border-[#333] bg-[#1e1e1e] p-3 text-white focus:ring-2 focus:ring-[#ec5588] focus:outline-none"
            value={username}
        />
    );
}
