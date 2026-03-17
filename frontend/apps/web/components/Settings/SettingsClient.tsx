"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { ChartLine, ImageUp, Lock } from "lucide-react";
import { rockIt } from "@/packages/lib/rockit/rockIt";
import ChangeLang from "@/components/Settings/ChangeLang";
import CrossFadeInput from "@/components/Settings/CrossFadeInput";
import DownloadAppButton from "@/components/Settings/DownloadAppButton";
import { useSettingsUser } from "@/components/Settings/hooks/useSettingsUser";
import LogOutButton from "@/components/Settings/LogOutButton";
import ServiceWorkerInfo from "@/components/Settings/ServiceWorkerInfo";

function SettingsSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800/60 bg-neutral-900/50 p-4 md:p-5">
            <h3 className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                {title}
            </h3>
            {children}
        </div>
    );
}

function ProfileSidebar() {
    const { username, isLoading } = useSettingsUser();

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="group relative">
                <Image
                    src={rockIt.USER_PLACEHOLDER_IMAGE_URL}
                    alt="Profile picture"
                    width={200}
                    height={200}
                    className="h-32 w-32 rounded-full object-cover ring-2 ring-neutral-700 transition-all group-hover:ring-[#ee1086] md:h-44 md:w-44"
                />
                <button
                    type="button"
                    aria-label="Change profile picture"
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                    <ImageUp className="h-8 w-8 text-white md:h-10 md:w-10" />
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center gap-1">
                    <div className="skeleton h-5 w-28 rounded" />
                    <div className="skeleton h-4 w-20 rounded" />
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-lg font-bold text-white">{username}</p>
                    <p className="text-sm text-neutral-500">@{username}</p>
                </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
                <LogOutButton />
                <Link
                    href="/stats"
                    className="flex items-center gap-1.5 rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 md:hidden"
                >
                    <ChartLine className="h-4 w-4" />
                    Stats
                </Link>
            </div>
        </div>
    );
}

function PasswordSection({
    vocabulary,
}: {
    vocabulary: Record<string, string>;
}) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="new-password"
                    className="text-sm font-medium text-neutral-400"
                >
                    {vocabulary.NEW_PASSWORD ?? "New password"}
                </label>
                <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white transition-colors focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086] focus:outline-none"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="repeat-password"
                    className="text-sm font-medium text-neutral-400"
                >
                    {vocabulary.REPEAT_PASSWORD ?? "Repeat password"}
                </label>
                <input
                    id="repeat-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white transition-colors focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086] focus:outline-none"
                />
            </div>
        </div>
    );
}

function DisplayNameInput({
    vocabulary,
}: {
    vocabulary: Record<string, string>;
}) {
    const { username, isLoading } = useSettingsUser();

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="display-name"
                className="text-sm font-medium text-neutral-400"
            >
                {vocabulary.DISPLAY_NAME ?? "Display name"}
            </label>
            <input
                id="display-name"
                type="text"
                defaultValue={isLoading ? "" : username}
                disabled={isLoading}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white transition-colors focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086] focus:outline-none disabled:opacity-50"
            />
        </div>
    );
}

export default function SettingsClient() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <div className="mx-auto max-w-4xl px-4 md:px-8 md:py-10 md:pb-10">
            <h1 className="mb-6 text-2xl font-bold text-white">
                {$vocabulary.USER_SETTINGS ?? "Settings"}
            </h1>

            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="md:sticky md:top-0 md:w-64 md:shrink-0">
                    <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/50 p-5">
                        <ProfileSidebar />
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <SettingsSection
                        title={$vocabulary.DISPLAY_NAME ?? "Account"}
                    >
                        <DisplayNameInput
                            vocabulary={
                                $vocabulary as unknown as Record<string, string>
                            }
                        />
                    </SettingsSection>

                    <SettingsSection title={$vocabulary.LANGUAGE ?? "Language"}>
                        <ChangeLang />
                    </SettingsSection>

                    <SettingsSection
                        title={$vocabulary.CHANGE_PASSWORD ?? "Password"}
                    >
                        <div className="mb-1 flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-neutral-500" />
                            <span className="text-xs text-neutral-500">
                                Leave blank to keep current password
                            </span>
                        </div>
                        <PasswordSection
                            vocabulary={
                                $vocabulary as unknown as Record<string, string>
                            }
                        />
                    </SettingsSection>

                    <SettingsSection title="Audio">
                        <CrossFadeInput />
                    </SettingsSection>

                    <SettingsSection title={$vocabulary.DOWNLOAD_APP ?? "App"}>
                        <DownloadAppButton />
                    </SettingsSection>

                    <SettingsSection title="Service Worker">
                        <ServiceWorkerInfo />
                    </SettingsSection>
                </div>
            </div>
        </div>
    );
}
